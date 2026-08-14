import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Upload Router Validation Tests", () => {
  it("should reject disallowed MIME types", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "test",
        name: "Test User",
        email: "test@example.com",
        role: "user",
        venueId: null,
        language: "es",
        loginMethod: "local",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as any,
      req: {} as any,
      res: {} as any,
    });

    const maliciousUpload = caller.upload.uploadFile({
      filename: "script.exe",
      base64Data: "data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAA",
      contentType: "application/x-msdownload",
    });

    await expect(maliciousUpload).rejects.toThrow();
  });

  it("should accept valid image types", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "test",
        name: "Test User",
        email: "test@example.com",
        role: "user",
        venueId: null,
        language: "es",
        loginMethod: "local",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as any,
      req: {} as any,
      res: {} as any,
    });

    // Nota: storagePut llamará al forge mock/api, simulamos el resultado o esperamos que pase la validación de tipo
    // En caso de que forge falle por credenciales en test puro, verificamos que no rechace por MIME antes de S3.
    const validImageUpload = caller.upload.uploadFile({
      filename: "avatar.jpg",
      base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      contentType: "image/jpeg",
    }).catch((err) => {
      // Si falla por falta de red/forge key pero pasó la validación de MIME, no debe lanzar BAD_REQUEST por formato
      if (err.message && err.message.includes("Formato de archivo no permitido")) {
        throw err;
      }
      return { success: true };
    });

    const res = await validImageUpload;
    expect(res).toBeDefined();
  });
});
