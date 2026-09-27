import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { parsePagination, buildPaginationMeta } from '@/lib/utils';
import {
  successResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// GET /api/admin/comments — List all comments (admin only)
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          novelId: true,
          content: true,
          createdAt: true,
          user: {
            select: { id: true, username: true },
          },
          novel: {
            select: { id: true, title: true, slug: true },
          },
        },
      }),
      prisma.comment.count(),
    ]);

    return successResponse({
      items: comments,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error('Get admin comments error:', error);
    return serverErrorResponse('Gagal mengambil data komentar');
  }
}
