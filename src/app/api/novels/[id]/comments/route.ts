import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { createCommentSchema } from '@/lib/validations/comment';
import { parsePagination, buildPaginationMeta } from '@/lib/utils';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

// GET /api/novels/:id/comments — List comments for a novel
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const novel = await prisma.novel.findUnique({ where: { id: novelId } });
    if (!novel) return notFoundResponse('Novel tidak ditemukan');

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { novelId },
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
        },
      }),
      prisma.comment.count({ where: { novelId } }),
    ]);

    return successResponse({
      items: comments,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return serverErrorResponse('Gagal mengambil data komentar');
  }
}

// POST /api/novels/:id/comments — Add comment (auth required)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const novel = await prisma.novel.findUnique({ where: { id: novelId } });
    if (!novel) return notFoundResponse('Novel tidak ditemukan');

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
    }

    const comment = await prisma.comment.create({
      data: {
        userId: user!.id,
        novelId,
        content: parsed.data.content,
      },
      select: {
        id: true,
        userId: true,
        novelId: true,
        content: true,
        createdAt: true,
        user: {
          select: { id: true, username: true },
        },
      },
    });

    return createdResponse(comment);
  } catch (error) {
    console.error('Create comment error:', error);
    return serverErrorResponse('Gagal membuat komentar');
  }
}
