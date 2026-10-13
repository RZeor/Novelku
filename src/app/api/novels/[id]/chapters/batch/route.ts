import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { batchCreateChaptersSchema } from '@/lib/validations/chapter';
import { countWords } from '@/lib/utils';
import {
  createdResponse,
  errorResponse,
  notFoundResponse,
  conflictResponse,
  serverErrorResponse,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

// POST /api/novels/:id/chapters/batch — Tambah banyak chapter sekaligus (Admin only)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    // 1. Otorisasi Admin
    const { user, error } = await requireAdmin();
    if (error) return error;

    // 2. Validasi ID Novel
    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const novel = await prisma.novel.findUnique({ where: { id: novelId } });
    if (!novel) return notFoundResponse('Novel tidak ditemukan');

    // 3. Validasi Body
    const body = await request.json().catch(() => ({}));
    const parsed = batchCreateChaptersSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
    }

    const { chapters } = parsed.data;

    // 4. Periksa apakah ada nomor chapter yang duplikat di dalam batch request itu sendiri
    const inputNumbers = chapters.map((c) => c.chapterNumber);
    const uniqueInputNumbers = new Set(inputNumbers);
    if (uniqueInputNumbers.size !== inputNumbers.length) {
      return errorResponse('Terdapat nomor chapter yang duplikat di dalam daftar unggahan', 400);
    }

    // 5. Periksa apakah ada nomor chapter yang sudah ada di database untuk novel ini
    const existingChapters = await prisma.chapter.findMany({
      where: {
        novelId,
        chapterNumber: { in: inputNumbers },
      },
      select: { chapterNumber: true },
    });

    if (existingChapters.length > 0) {
      const existingList = existingChapters.map((c) => c.chapterNumber).join(', ');
      return conflictResponse(
        `Nomor chapter berikut sudah ada di novel ini: ${existingList}`
      );
    }

    // 6. Siapkan data dengan kalkulasi wordCount
    const chaptersData = chapters.map((c) => ({
      novelId,
      chapterNumber: c.chapterNumber,
      title: c.title.trim(),
      content: c.content,
      wordCount: countWords(c.content),
    }));

    // 7. Simpan secara atomik via Prisma Transaction
    await prisma.$transaction(async (tx) => {
      // Create chapters
      await tx.chapter.createMany({
        data: chaptersData,
      });

      // Update total chapters di novel
      await tx.novel.update({
        where: { id: novelId },
        data: {
          totalChapters: { increment: chaptersData.length },
        },
      });
    });

    return createdResponse({
      message: `Berhasil menambahkan ${chaptersData.length} chapter baru`,
      createdCount: chaptersData.length,
    });
  } catch (err: unknown) {
    console.error('Batch create chapters error:', err);
    return serverErrorResponse('Gagal menambahkan chapter secara batch');
  }
}
