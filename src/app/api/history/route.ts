import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { parsePagination, buildPaginationMeta } from '@/lib/utils';
import {
  successResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// GET /api/history — List user's reading history
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const [histories, total] = await Promise.all([
      prisma.readingHistory.findMany({
        where: { userId: user!.id },
        orderBy: { lastReadAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          novelId: true,
          chapterId: true,
          lastReadAt: true,
          novel: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverImage: true,
            },
          },
          chapter: {
            select: {
              id: true,
              chapterNumber: true,
              title: true,
            },
          },
        },
      }),
      prisma.readingHistory.count({ where: { userId: user!.id } }),
    ]);

    return successResponse({
      items: histories,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error('Get reading history error:', error);
    return serverErrorResponse('Gagal mengambil riwayat baca');
  }
}
