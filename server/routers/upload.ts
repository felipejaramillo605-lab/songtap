import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const uploadRouter = router({
  uploadFile: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        base64Data: z.string(),
        contentType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
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

        const res = await storagePut(input.filename, buffer, actualMime);
        return { success: true, url: res.url };
      } catch (err: any) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al subir archivo: ${err.message}`,
        });
      }
    }),
});
