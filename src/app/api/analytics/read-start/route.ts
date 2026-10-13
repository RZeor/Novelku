import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { readStartSchema } from '@/lib/validations/analytics';
import {
  successResponse,
  createdResponse,
  errorResponse,
  conflictResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// POST /api/analytics/read-start — Inisiasi sesi membaca (hanya pengguna terautentikasi)
export async function POST(request: NextRequest) {
  try {
    // 1. Cek autentikasi user
    const user = await getCurrentUser();
    if (!user) {
      // Non-login: tidak membuat sesi analitik, return status non-tracking dengan aman
      return successResponse({ tracked: false, message: 'Sesi anonim tidak dilacak' });
    }

    // 2. Validasi body input
    const body = await request.json().catch(() => ({}));
    const parsed = readStartSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
    }

    const { sessionId, novelId, chapterId } = parsed.data;

    // 3. Validasi keberadaan bab dan keterkaitannya dengan novel
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true, novelId: true },
    });

    if (!chapter) {
      return errorResponse('Chapter tidak ditemukan', 404);
    }

    if (chapter.novelId !== novelId) {
      return errorResponse('Chapter tidak sesuai dengan novel yang diminta', 400);
    }

    // 4. Cek apakah sessionId sudah ada (Idempotency check)
    const existingSession = await prisma.readingSession.findUnique({
      where: { sessionId },
    });

    if (existingSession) {
      // Jika pemilik dan pasangan novel-bab identik: IDEMPOTEN, kembalikan sesi yang ada
      if (
        existingSession.userId === user.id &&
        existingSession.novelId === novelId &&
        existingSession.chapterId === chapterId
      ) {
        return successResponse({
          tracked: true,
          session: existingSession,
          reused: true,
        });
      }

      // Jika sessionId sudah dipakai user atau bab lain: Konflik kepemilikan
      return conflictResponse('Session ID sudah digunakan untuk konteks atau pengguna lain');
    }

    // 5. Buat sesi baru untuk pengguna
    const newSession = await prisma.readingSession.create({
      data: {
        sessionId,
        userId: user.id,
        novelId,
        chapterId,
        startTime: new Date(),
        lastHeartbeat: new Date(),
        durationSeconds: 0,
        isCompleted: false,
      },
    });

    return createdResponse({
      tracked: true,
      session: newSession,
      reused: false,
    });
  } catch (error) {
    console.error('Read start analytics error:', error);
    return serverErrorResponse('Gagal mencatat sesi membaca');
  }
}
