import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/comments/:id — Delete comment (author or admin)
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const commentId = parseInt(id, 10);
    if (isNaN(commentId)) return errorResponse('ID komentar tidak valid', 400);

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return notFoundResponse('Komentar tidak ditemukan');

    // Only comment author or admin can delete
    if (comment.userId !== user!.id && user!.role !== 'ADMIN') {
      return forbiddenResponse('Anda tidak memiliki izin untuk menghapus komentar ini');
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return successResponse({ message: 'Komentar berhasil dihapus' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return serverErrorResponse('Gagal menghapus komentar');
  }
}
