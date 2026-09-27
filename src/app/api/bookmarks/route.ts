import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { parsePagination, buildPaginationMeta } from '@/lib/utils';
import {
  successResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// GET /api/bookmarks — List user's bookmarks
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const [bookmarks, total] = await Promise.all([
      prisma.bookmark.findMany({
        where: { userId: user!.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          novelId: true,
          createdAt: true,
          novel: {
            select: {
              id: true,
              title: true,
              slug: true,
              author: true,
              coverImage: true,
              status: true,
              totalChapters: true,
              averageRating: true,
            },
          },
        },
      }),
      prisma.bookmark.count({ where: { userId: user!.id } }),
    ]);

    return successResponse({
      items: bookmarks,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    return serverErrorResponse('Gagal mengambil data bookmark');
  }
}
