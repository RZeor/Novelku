import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

// POST /api/novels/:id/like — Like a novel
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const novel = await prisma.novel.findUnique({ where: { id: novelId } });
    if (!novel) return notFoundResponse('Novel tidak ditemukan');

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: { userId_novelId: { userId: user!.id, novelId } },
    });
    if (existingLike) {
      return successResponse({ message: 'Novel sudah di-like', liked: true });
    }

    await prisma.like.create({
      data: { userId: user!.id, novelId },
    });

    return createdResponse({ message: 'Novel berhasil di-like', liked: true });
  } catch (error) {
    console.error('Like novel error:', error);
    return serverErrorResponse('Gagal like novel');
  }
}

// DELETE /api/novels/:id/like — Unlike a novel
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const existingLike = await prisma.like.findUnique({
      where: { userId_novelId: { userId: user!.id, novelId } },
    });
    if (!existingLike) {
      return notFoundResponse('Anda belum like novel ini');
    }

    await prisma.like.delete({
      where: { userId_novelId: { userId: user!.id, novelId } },
    });

    return successResponse({ message: 'Like berhasil dihapus', liked: false });
  } catch (error) {
    console.error('Unlike novel error:', error);
    return serverErrorResponse('Gagal unlike novel');
  }
}
