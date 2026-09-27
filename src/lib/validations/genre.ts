import { z } from 'zod';

export const createGenreSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama genre wajib diisi')
    .max(100, 'Nama genre maksimal 100 karakter'),
});

export const updateGenreSchema = createGenreSchema;

export type CreateGenreInput = z.infer<typeof createGenreSchema>;
export type UpdateGenreInput = z.infer<typeof updateGenreSchema>;
