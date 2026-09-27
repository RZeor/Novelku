import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { parsePagination, buildPaginationMeta } from '@/lib/utils';
import {
  successResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// GET /api/admin/users — List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get('search') || undefined;

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return successResponse({
      items: users,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return serverErrorResponse('Gagal mengambil data user');
  }
}
