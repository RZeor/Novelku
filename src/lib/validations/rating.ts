import { z } from 'zod';

export const createRatingSchema = z.object({
  value: z
    .number()
    .int('Rating harus bilangan bulat')
    .min(1, 'Rating minimal 1')
    .max(5, 'Rating maksimal 5'),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
