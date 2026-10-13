import { z } from 'zod';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Schema untuk POST /api/analytics/read-start
export const readStartSchema = z.object({
  sessionId: z
    .string()
    .min(1, 'Session ID wajib diisi')
    .max(64, 'Session ID maksimal 64 karakter')
    .refine((val) => UUID_V4_REGEX.test(val) || val.length >= 16, {
      message: 'Format Session ID tidak valid',
    }),
  novelId: z
    .number()
    .int('Novel ID harus berupa bilangan bulat')
    .positive('Novel ID harus positif'),
  chapterId: z
    .number()
    .int('Chapter ID harus berupa bilangan bulat')
    .positive('Chapter ID harus positif'),
});

// Schema untuk POST /api/analytics/heartbeat
export const heartbeatSchema = z.object({
  sessionId: z
    .string()
    .min(1, 'Session ID wajib diisi')
    .max(64, 'Session ID maksimal 64 karakter'),
});

// Schema untuk GET /api/admin/analytics query params
export const analyticsQuerySchema = z
  .object({
    period: z.enum(['7d', '30d', 'custom']).default('7d'),
    startDate: z
      .string()
      .regex(DATE_REGEX, 'Format tanggal harus YYYY-MM-DD')
      .optional(),
    endDate: z
      .string()
      .regex(DATE_REGEX, 'Format tanggal harus YYYY-MM-DD')
      .optional(),
    novelId: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine((val) => val === undefined || (!isNaN(val) && val > 0), {
        message: 'ID novel tidak valid',
      }),
    sortBy: z.enum(['activities', 'uniqueReaders']).default('activities'),
  })
  .refine(
    (data) => {
      if (data.period === 'custom') {
        return Boolean(data.startDate && data.endDate);
      }
      return true;
    },
    {
      message: 'Tanggal mulai dan selesai wajib diisi untuk periode kustom',
      path: ['startDate'],
    }
  );

export type ReadStartInput = z.infer<typeof readStartSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
