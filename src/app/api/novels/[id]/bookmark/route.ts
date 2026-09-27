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

// POST /api/novels/:id/bookmark — Bookmark a novel
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const novel = await prisma.novel.findUnique({ where: { id: novelId } });
    if (!novel) return notFoundResponse('Novel tidak ditemukan');

    // Check if already bookmarked
    const existingBookmark = await prisma.bookmark.findUnique({
      where: { userId_novelId: { userId: user!.id, novelId } },
    });
    if (existingBookmark) {
      return successResponse({ message: 'Novel sudah di-bookmark', bookmarked: true });
    }

    await prisma.bookmark.create({
      data: { userId: user!.id, novelId },
    });

    return createdResponse({ message: 'Novel berhasil di-bookmark', bookmarked: true });
  } catch (error) {
    console.error('Bookmark novel error:', error);
    return serverErrorResponse('Gagal bookmark novel');
  }
}

// DELETE /api/novels/:id/bookmark — Remove bookmark
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const existingBookmark = await prisma.bookmark.findUnique({
      where: { userId_novelId: { userId: user!.id, novelId } },
    });
    if (!existingBookmark) {
      return notFoundResponse('Novel belum di-bookmark');
    }

    await prisma.bookmark.delete({
      where: { userId_novelId: { userId: user!.id, novelId } },
    });

    return successResponse({ message: 'Bookmark berhasil dihapus', bookmarked: false });
  } catch (error) {
    console.error('Remove bookmark error:', error);
    return serverErrorResponse('Gagal menghapus bookmark');
  }
}
