import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

// POST /api/chapters/:id/history — Record reading history
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const chapterId = parseInt(id, 10);
    if (isNaN(chapterId)) return errorResponse('ID chapter tidak valid', 400);

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true, novelId: true },
    });
    if (!chapter) return notFoundResponse('Chapter tidak ditemukan');

    // Upsert reading history
    const history = await prisma.readingHistory.upsert({
      where: {
        userId_chapterId: {
          userId: user!.id,
          chapterId,
        },
      },
      update: {
        lastReadAt: new Date(),
      },
      create: {
        userId: user!.id,
        novelId: chapter.novelId,
        chapterId,
        lastReadAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        novelId: true,
        chapterId: true,
        lastReadAt: true,
      },
    });

    // Also increment novel view count
    await prisma.novel.update({
      where: { id: chapter.novelId },
      data: { viewCount: { increment: 1 } },
    });

    return successResponse(history);
  } catch (error) {
    console.error('Record reading history error:', error);
    return serverErrorResponse('Gagal menyimpan riwayat baca');
  }
}
