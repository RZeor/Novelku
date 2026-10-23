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

// GET /api/novels/:id/reading-progress — Get user's reading progress for a specific novel
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    // Verify novel exists
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true },
    });
    if (!novel) return notFoundResponse('Novel tidak ditemukan');

    // Get reading history for this user and novel
    const history = await prisma.readingHistory.findUnique({
      where: {
        userId_novelId: {
          userId: user!.id,
          novelId,
        },
      },
      select: {
        id: true,
        userId: true,
        novelId: true,
        chapterId: true,
        lastReadAt: true,
        chapter: {
          select: {
            id: true,
            chapterNumber: true,
            title: true,
          },
        },
      },
    });

    if (!history) {
      // No history yet - return null progress
      return successResponse({ progress: null });
    }

    // Verify the chapter still exists and belongs to this novel
    if (history.chapter) {
      return successResponse({
        progress: {
          chapterId: history.chapterId,
          chapterNumber: history.chapter.chapterNumber,
          chapterTitle: history.chapter.title,
          lastReadAt: history.lastReadAt,
        },
      });
    }

    // Chapter was deleted or doesn't exist - return null to fallback to chapter 1
    return successResponse({ progress: null });
  } catch (error) {
    console.error('Get reading progress error:', error);
    return serverErrorResponse('Gagal mengambil progres baca');
  }
}