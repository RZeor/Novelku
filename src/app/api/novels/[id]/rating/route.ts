import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-guard';
import { createRatingSchema } from '@/lib/validations/rating';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

// Helper to recalculate average rating. Returns the fresh aggregate values.
async function recalculateRating(novelId: number) {
  const result = await prisma.rating.aggregate({
    where: { novelId },
    _avg: { value: true },
    _count: { value: true },
  });

  const averageRating = result._avg.value
    ? parseFloat(result._avg.value.toFixed(2))
    : 0;
  const ratingCount = result._count.value;

  await prisma.novel.update({
    where: { id: novelId },
    data: { averageRating, ratingCount },
  });

  return { averageRating, ratingCount };
}

// POST /api/novels/:id/rating — Create rating
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
    const parsed = createRatingSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
    }

    // Check existing rating
    const existingRating = await prisma.rating.findUnique({
      where: { userId_novelId: { userId: user!.id, novelId } },
    });

    if (existingRating) {
      // Update existing rating
      const rating = await prisma.rating.update({
        where: { id: existingRating.id },
        data: { value: parsed.data.value },
        select: { id: true, userId: true, novelId: true, value: true, createdAt: true, updatedAt: true },
      });

      const fresh = await recalculateRating(novelId);

      return successResponse({
        ...rating,
        averageRating: fresh.averageRating,
        ratingCount: fresh.ratingCount,
        message: 'Rating berhasil diupdate',
      });
    }

    // Create new rating
    const rating = await prisma.rating.create({
      data: {
        userId: user!.id,
        novelId,
        value: parsed.data.value,
      },
      select: { id: true, userId: true, novelId: true, value: true, createdAt: true, updatedAt: true },
    });

    const fresh = await recalculateRating(novelId);

    return createdResponse({
      ...rating,
      averageRating: fresh.averageRating,
      ratingCount: fresh.ratingCount,
    });
  } catch (error) {
    console.error('Create/update rating error:', error);
    return serverErrorResponse('Gagal memberi rating');
  }
}

// PUT /api/novels/:id/rating — Update rating (alias for POST with existing check)
export async function PUT(request: NextRequest, { params }: Params) {
  return POST(request, { params });
}
