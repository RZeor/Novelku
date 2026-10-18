import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username minimal 3 karakter')
    .max(50, 'Username maksimal 50 karakter')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore'),
  email: z
    .string()
    .email('Format email tidak valid')
    .max(255, 'Email maksimal 255 karakter'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(100, 'Password maksimal 100 karakter'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Format email tidak valid'),
  password: z
    .string()
    .min(1, 'Password wajib diisi'),
  rememberMe: z
    .boolean()
    .optional()
    .default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
