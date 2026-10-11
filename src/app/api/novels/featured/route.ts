import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

// ============================================================
// GET /api/novels/featured
// Mengambil daftar novel unggulan untuk Hero Slider di halaman
// utama. Hanya mengembalikan field yang dibutuhkan slider
// (id, judul, slug, sinopsis, cover, genre, statistik ringkas)
// agar payload tetap ringan.
//
// Kriteria pemilihan (sesuai skema yang tersedia — tidak ada
// kolom `featured`/`isFeatured` di database):
//  1. Mengutamakan novel dengan cover (wajib untuk slider visual).
//  2. Lalu: rating tertinggi -> paling banyak dilihat -> terbaru.
// Ini menghasilkan novel yang paling layak tampil secara visual
// dan populer tanpa mengubah skema database.
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      10,
      Math.max(1, parseInt(searchParams.get('limit') || '5', 10))
    );

    const novels = await prisma.novel.findMany({
      // Hanya novel dengan cover — slider membutuhkan visual.
      where: { coverImage: { not: null } },
      orderBy: [
        { averageRating: 'desc' },
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        coverImage: true,
        author: true,
        status: true,
        totalChapters: true,
        viewCount: true,
        averageRating: true,
        ratingCount: true,
        genres: {
          select: {
            genre: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    const items = novels.map((novel) => ({
      id: novel.id,
      title: novel.title,
      slug: novel.slug,
      description: novel.description,
      coverImage: novel.coverImage,
      author: novel.author,
      status: novel.status,
      totalChapters: novel.totalChapters,
      viewCount: novel.viewCount,
      averageRating: Number(novel.averageRating),
      ratingCount: novel.ratingCount,
      genres: novel.genres.map((ng) => ng.genre),
    }));

    return successResponse(items);
  } catch (error) {
    console.error('Get featured novels error:', error);
    return serverErrorResponse('Gagal mengambil data novel unggulan');
  }
}
