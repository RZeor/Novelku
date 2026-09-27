import { z } from 'zod';

export const createChapterSchema = z.object({
  chapterNumber: z
    .number()
    .int('Nomor chapter harus bilangan bulat')
    .positive('Nomor chapter harus positif'),
  title: z
    .string()
    .min(1, 'Judul chapter wajib diisi')
    .max(255, 'Judul chapter maksimal 255 karakter'),
  content: z
    .string()
    .min(1, 'Konten chapter wajib diisi')
    .max(5000000, 'Konten chapter terlalu panjang (maks 5MB teks)'),
});

export const updateChapterSchema = createChapterSchema.partial();

export type CreateChapterInput = z.infer<typeof createChapterSchema>;
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;
