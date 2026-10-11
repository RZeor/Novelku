import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

// ============================================================
// GET /api/novels/updates
// Mengambil novel yang BARU MENDAPAT UPDATE CHAPTER.
//
// Kriteria "update":
//  - Novel sudah memiliki minimal 1 chapter (novel yang baru
//    ditambahkan langsung tampil di daftar update).
//  - Diurutkan berdasarkan tanggal rilis chapter terbaru.
//
// Catatan: tidak memakai novel.updatedAt karena kolom tersebut
// juga berubah saat viewCount bertambah.
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      20,
      Math.max(1, parseInt(searchParams.get('limit') || '8', 10))
    );

    // Hitung chapter terbaru per novel
    const grouped = await prisma.chapter.groupBy({
      by: ['novelId'],
      _max: { createdAt: true, chapterNumber: true },
      orderBy: { _max: { createdAt: 'desc' } },
    });

    const updated = grouped.slice(0, limit);

    const novelIds = updated.map((g) => g.novelId);

    const novels = await prisma.novel.findMany({
      where: { id: { in: novelIds } },
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
            genre: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    const novelMap = new Map(novels.map((n) => [n.id, n]));

    // Ambil beberapa chapter terbaru per novel untuk ditampilkan di kartu
    const chapters = await prisma.chapter.findMany({
      where: { novelId: { in: novelIds } },
      orderBy: [{ chapterNumber: 'desc' }],
      select: {
        id: true,
        novelId: true,
        chapterNumber: true,
        title: true,
        createdAt: true,
      },
    });

    const RECENT_LIMIT = 3;
    const chaptersByNovel = new Map<number, typeof chapters>();
    for (const chapter of chapters) {
      const list = chaptersByNovel.get(chapter.novelId) ?? [];
      if (list.length < RECENT_LIMIT) {
        list.push(chapter);
        chaptersByNovel.set(chapter.novelId, list);
      }
    }

    const items = updated
      .map((g) => {
        const novel = novelMap.get(g.novelId);
        if (!novel) return null;

        return {
          ...novel,
          genres: novel.genres.map((ng) => ng.genre),
          lastChapterNumber: g._max.chapterNumber,
          lastUpdatedAt: g._max.createdAt,
          recentChapters: (chaptersByNovel.get(g.novelId) ?? []).map((c) => ({
            id: c.id,
            chapterNumber: c.chapterNumber,
            title: c.title,
            createdAt: c.createdAt,
          })),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return successResponse(items);
  } catch (error) {
    console.error('Get updated novels error:', error);
    return serverErrorResponse('Gagal mengambil data novel update');
  }
}