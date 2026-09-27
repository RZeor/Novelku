import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { createNovelSchema } from '@/lib/validations/novel';
import { generateSlug, parsePagination, buildPaginationMeta } from '@/lib/utils';
import {
  successResponse,
  createdResponse,
  errorResponse,
  conflictResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { Prisma } from '@/generated/prisma/client';

// GET /api/novels — List novels with search, filter, pagination, sorting
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const search = searchParams.get('search') || undefined;
    const genre = searchParams.get('genre') || undefined;
    const status = searchParams.get('status') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where: Prisma.NovelWhereInput = {};

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    if (genre) {
      where.genres = {
        some: {
          genre: { slug: genre },
        },
      };
    }

    if (status && ['ONGOING', 'COMPLETED', 'HIATUS'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase() as 'ONGOING' | 'COMPLETED' | 'HIATUS';
    }

    // Build orderBy
    const allowedSortFields = ['createdAt', 'title', 'viewCount', 'averageRating'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy = { [orderByField]: sortOrder };

    const [novels, total] = await Promise.all([
      prisma.novel.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          author: true,
          coverImage: true,
          status: true,
          totalChapters: true,
          viewCount: true,
          averageRating: true,
          ratingCount: true,
          createdAt: true,
          genres: {
            select: {
              genre: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
      prisma.novel.count({ where }),
    ]);

    // Flatten genres
    const formattedNovels = novels.map((novel) => ({
      ...novel,
      genres: novel.genres.map((ng) => ng.genre),
    }));

    return successResponse({
      items: formattedNovels,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    console.error('Get novels error:', error);
    return serverErrorResponse('Gagal mengambil data novel');
  }
}

// POST /api/novels — Create novel (admin only)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const parsed = createNovelSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
    }

    const { title, description, author, coverImage, status, genreIds } = parsed.data;

    // Generate unique slug
    let slug = generateSlug(title);
    const existingSlug = await prisma.novel.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Validate genreIds exist
    if (genreIds && genreIds.length > 0) {
      const existingGenres = await prisma.genre.findMany({
        where: { id: { in: genreIds } },
      });
      if (existingGenres.length !== genreIds.length) {
        return errorResponse('Satu atau lebih genre tidak ditemukan', 400);
      }
    }

    const novel = await prisma.novel.create({
      data: {
        title,
        slug,
        description: description || null,
        author,
        coverImage: coverImage || null,
        status: status || 'ONGOING',
        genres: genreIds
          ? {
              create: genreIds.map((genreId) => ({
                genre: { connect: { id: genreId } },
              })),
            }
          : undefined,
      },
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

    return createdResponse(formattedNovel);
  } catch (error) {
    console.error('Create novel error:', error);
    return serverErrorResponse('Gagal membuat novel');
  }
}
