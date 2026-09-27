import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Komentar wajib diisi')
    .max(2000, 'Komentar maksimal 2000 karakter'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
