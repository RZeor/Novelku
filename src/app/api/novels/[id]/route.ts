import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { updateNovelSchema } from '@/lib/validations/novel';
import { generateSlug } from '@/lib/utils';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

// GET /api/novels/:id — Get novel detail
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        author: true,
        coverImage: true,
        status: true,
        totalChapters: true,
        viewCount: true,
        averageRating: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true,
        genres: {
          select: {
            genre: { select: { id: true, name: true, slug: true } },
          },
        },
        chapters: {
          select: {
            id: true,
            chapterNumber: true,
            title: true,
            wordCount: true,
            createdAt: true,
          },
          orderBy: { chapterNumber: 'asc' },
        },
      },
    });

    if (!novel) return notFoundResponse('Novel tidak ditemukan');

    // Increment view count
    await prisma.novel.update({
      where: { id: novelId },
      data: { viewCount: { increment: 1 } },
    });

    const formattedNovel = {
      ...novel,
      viewCount: novel.viewCount + 1,
      genres: novel.genres.map((ng) => ng.genre),
    };

    return successResponse(formattedNovel);
  } catch (error) {
    console.error('Get novel detail error:', error);
    return serverErrorResponse('Gagal mengambil detail novel');
  }
}

// PUT /api/novels/:id — Update novel (admin only)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const existing = await prisma.novel.findUnique({ where: { id: novelId } });
    if (!existing) return notFoundResponse('Novel tidak ditemukan');

    const body = await request.json();
    const parsed = updateNovelSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
    }

    const { title, description, author, coverImage, status, genreIds } = parsed.data;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) {
      updateData.title = title;
      updateData.slug = generateSlug(title);
    }
    if (description !== undefined) updateData.description = description;
    if (author !== undefined) updateData.author = author;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (status !== undefined) updateData.status = status;

    // Handle genre update
    if (genreIds !== undefined) {
      // Delete old genre relations and create new ones
      await prisma.novelGenre.deleteMany({ where: { novelId } });
      if (genreIds.length > 0) {
        await prisma.novelGenre.createMany({
          data: genreIds.map((genreId) => ({ novelId, genreId })),
        });
      }
    }

    const novel = await prisma.novel.update({
      where: { id: novelId },
      data: updateData,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        author: true,
        coverImage: true,
        status: true,
        totalChapters: true,
        viewCount: true,
        averageRating: true,
        ratingCount: true,
        createdAt: true,
        updatedAt: true,
        genres: {
          select: {
            genre: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    const formattedNovel = {
      ...novel,
      genres: novel.genres.map((ng) => ng.genre),
    };

    return successResponse(formattedNovel);
  } catch (error) {
    console.error('Update novel error:', error);
    return serverErrorResponse('Gagal mengupdate novel');
  }
}

// DELETE /api/novels/:id — Delete novel (admin only)
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const existing = await prisma.novel.findUnique({ where: { id: novelId } });
    if (!existing) return notFoundResponse('Novel tidak ditemukan');

    await prisma.novel.delete({ where: { id: novelId } });

    return successResponse({ message: 'Novel berhasil dihapus' });
  } catch (error) {
    console.error('Delete novel error:', error);
    return serverErrorResponse('Gagal menghapus novel');
  }
}
