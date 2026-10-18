import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, updateAdminActivity } from '@/lib/auth-guard';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const updateStatusSchema = z.object({
  isActive: z.boolean({ message: 'isActive harus boolean' }),
});

// PATCH /api/admin/users/:id/status — Toggle user active status (admin only)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { user: admin, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return errorResponse('ID user tidak valid', 400);

    // Prevent admin from deactivating themselves
    if (userId === admin!.id) {
      return errorResponse('Anda tidak dapat menonaktifkan akun Anda sendiri', 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) return notFoundResponse('User tidak ditemukan');

    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive: parsed.data.isActive },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const statusText = parsed.data.isActive ? 'diaktifkan' : 'dinonaktifkan';

    // Update admin activity on successful mutation
    await updateAdminActivity(admin!.id);

    return successResponse({
      ...updatedUser,
      message: `User berhasil ${statusText}`,
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return serverErrorResponse('Gagal mengupdate status user');
  }
}
