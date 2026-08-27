import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerOwnerReportScheduleRoute } from "../scheduled/ownerReport";
import { registerInventoryExpiryScheduleRoute } from "../scheduled/inventoryExpiry";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

const requestBodyErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  const type = typeof error === "object" && error !== null && "type" in error ? error.type : undefined;
  if (type === "entity.too.large") {
    res.status(413).json({ error: "Request body too large" });
    return;
  }
  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ error: "Invalid JSON request body" });
    return;
  }
  next(error);
};

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Solo se confían proxies de red local o privada gestionados por la plataforma.
  // No se acepta un X-Forwarded-For arbitrario enviado directamente por clientes.
  app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const scriptSource = process.env.NODE_ENV === "production"
      ? "script-src 'self' https://*.manus.com; "
      : "script-src 'self' 'unsafe-inline' https://*.manus.com; ";
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; " +
        scriptSource + "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.manus.im https://*.manus.com; frame-src 'none'"
    );
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    next();
  });
  // El router de carga limita los archivos a 5 MB. Este límite evita que otros
  // endpoints tRPC acepten cuerpos excesivos sin impedir los Data URL permitidos.
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ limit: "8mb", extended: true }));
  app.use(requestBodyErrorHandler);
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerOwnerReportScheduleRoute(app);
  registerInventoryExpiryScheduleRoute(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
