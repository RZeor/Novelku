import { z } from 'zod';

export const createNovelSchema = z.object({
  title: z
    .string()
    .min(1, 'Judul novel wajib diisi')
    .max(255, 'Judul novel maksimal 255 karakter'),
  description: z
    .string()
    .max(10000, 'Deskripsi maksimal 10000 karakter')
    .optional()
    .nullable(),
  author: z
    .string()
    .min(1, 'Nama penulis wajib diisi')
    .max(150, 'Nama penulis maksimal 150 karakter'),
  coverImage: z
    .string()
    .url('Format URL cover image tidak valid')
    .max(500, 'URL cover image maksimal 500 karakter')
    .optional()
    .nullable(),
  status: z
    .enum(['ONGOING', 'COMPLETED', 'HIATUS'], {
      message: 'Status harus ONGOING, COMPLETED, atau HIATUS',
    })
    .optional()
    .default('ONGOING'),
  genreIds: z
    .array(z.number().int().positive())
    .min(1, 'Minimal pilih 1 genre')
    .optional(),
});

export const updateNovelSchema = createNovelSchema.partial();

export type CreateNovelInput = z.infer<typeof createNovelSchema>;
export type UpdateNovelInput = z.infer<typeof updateNovelSchema>;
