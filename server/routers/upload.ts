import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

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
      try {
        const matches = input.base64Data.match(/^data:(.+);base64,(.+)$/);
        let buffer: Buffer;
        if (matches && matches.length === 3) {
          buffer = Buffer.from(matches[2], "base64");
        } else {
          buffer = Buffer.from(input.base64Data, "base64");
        }

        const res = await storagePut(input.filename, buffer, input.contentType);
        return { success: true, url: res.url };
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al subir archivo: ${err.message}`,
        });
      }
    }),
});
