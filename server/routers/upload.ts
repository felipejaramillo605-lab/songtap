import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { z } from "zod";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const extensionByMime: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function matchesFileSignature(buffer: Buffer, mime: string) {
  if (mime === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mime === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mime === "application/msword") return buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return buffer.subarray(0, 4).toString("ascii") === "PK\x03\x04";
  return false;
}

export const uploadRouter = router({
  uploadFile: protectedProcedure
    .input(
      z.object({
        filename: z.string().trim().min(1).max(120),
        base64Data: z.string().min(1).max(7_000_000),
        contentType: z.string(),
        purpose: z.enum(["general", "cv"]).optional().default("general"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Extraer y validar el MIME real desde el Data URL si está presente
      const matches = input.base64Data.match(/^data:(.+);base64,(.+)$/);
      const actualMime = matches ? matches[1] : input.contentType;

      const isImage = ALLOWED_IMAGE_TYPES.includes(actualMime);
      const isDoc = ALLOWED_DOC_TYPES.includes(actualMime);

      if (!isImage && !isDoc) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Formato de archivo no permitido (${actualMime}). Solo se permiten imágenes (JPEG, PNG, WEBP) o documentos (PDF, DOC, DOCX).`,
        });
      }
      if (input.purpose === "cv" && !isDoc) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Un CV debe ser un documento PDF, DOC o DOCX." });
      }

      try {
        let buffer: Buffer;
        if (matches && matches.length === 3) {
          buffer = Buffer.from(matches[2], "base64");
        } else {
          buffer = Buffer.from(input.base64Data, "base64");
        }

        // Validar tamaño en bytes
        if (buffer.length > MAX_FILE_SIZE_BYTES) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El archivo excede el límite máximo permitido de 5MB.",
          });
        }
        if (!matchesFileSignature(buffer, actualMime)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El contenido del archivo no coincide con el formato declarado." });
        }

        const extension = extensionByMime[actualMime];
        const safeKey = input.purpose === "cv"
          ? `private/cv/${ctx.user.id}/${randomUUID()}.${extension}`
          : `uploads/${ctx.user.id}/${randomUUID()}.${extension}`;
        const res = await storagePut(safeKey, buffer, actualMime);
        return {
          success: true,
          url: input.purpose === "cv" ? `private-cv://${res.key}` : res.url,
          isPrivate: input.purpose === "cv",
        };
      } catch (err: any) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al subir archivo: ${err.message}`,
        });
      }
    }),
});
