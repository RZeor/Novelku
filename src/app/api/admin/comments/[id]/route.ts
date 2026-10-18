import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, updateAdminActivity } from '@/lib/auth-guard';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/admin/comments/:id — Delete any comment (admin only)
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const commentId = parseInt(id, 10);
    if (isNaN(commentId)) return errorResponse('ID komentar tidak valid', 400);

    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return notFoundResponse('Komentar tidak ditemukan');

    await prisma.comment.delete({ where: { id: commentId } });

    // Update admin activity on successful mutation
    await updateAdminActivity(user!.id);

    return successResponse({ message: 'Komentar berhasil dihapus' });
  } catch (error) {
    console.error('Admin delete comment error:', error);
    return serverErrorResponse('Gagal menghapus komentar');
  }
}
