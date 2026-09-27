import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import {
  successResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// GET /api/admin/dashboard — Dashboard statistics (admin only)
export async function GET() {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const [totalUsers, totalNovels, totalChapters, totalLikes, totalComments, totalRatings] =
      await Promise.all([
        prisma.user.count(),
        prisma.novel.count(),
        prisma.chapter.count(),
        prisma.like.count(),
        prisma.comment.count(),
        prisma.rating.count(),
      ]);

    return successResponse({
      totalUsers,
      totalNovels,
      totalChapters,
      totalLikes,
      totalComments,
      totalRatings,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return serverErrorResponse('Gagal mengambil statistik dashboard');
  }
}
