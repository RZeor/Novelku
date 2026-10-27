import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { updateChapterSchema } from '@/lib/validations/chapter';
import { countWords } from '@/lib/utils';
import { sanitizeChapterContent } from '@/lib/sanitize';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

// GET /api/chapters/:id — Get chapter content (for reading)
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const chapterId = parseInt(id, 10);
    if (isNaN(chapterId)) return errorResponse('ID chapter tidak valid', 400);

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        novelId: true,
        chapterNumber: true,
        title: true,
        content: true,
        wordCount: true,
        createdAt: true,
        updatedAt: true,
        novel: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    if (!chapter) return notFoundResponse('Chapter tidak ditemukan');

    // Catat view novel setiap kali chapter dibuka (semua pengunjung)
    await prisma.novel.update({
      where: { id: chapter.novelId },
      data: { viewCount: { increment: 1 } },
    });

    return successResponse(chapter);
  } catch (error) {
    console.error('Get chapter error:', error);
    return serverErrorResponse('Gagal mengambil data chapter');
  }
}

// PUT /api/chapters/:id — Update chapter (admin only)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const chapterId = parseInt(id, 10);
    if (isNaN(chapterId)) return errorResponse('ID chapter tidak valid', 400);

    const existing = await prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!existing) return notFoundResponse('Chapter tidak ditemukan');

    const contentType = request.headers.get('content-type') || '';
    let updateData: Record<string, unknown> = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const chapterNumberStr = formData.get('chapterNumber') as string | null;
      const titleStr = formData.get('title') as string | null;

      if (chapterNumberStr) updateData.chapterNumber = parseInt(chapterNumberStr, 10);
      if (titleStr) updateData.title = titleStr.trim();

      if (file) {
        if (!file.name.endsWith('.txt')) return errorResponse('Hanya file .txt yang diperbolehkan', 400);
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) return errorResponse('Ukuran file maksimal 5MB', 400);
        let content = await file.text();
        content = sanitizeChapterContent(content.trim());
        updateData.content = content;
        updateData.wordCount = countWords(content);
      }
    } else {
      const body = await request.json();
      const parsed = updateChapterSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
      }
      if (parsed.data.chapterNumber !== undefined) updateData.chapterNumber = parsed.data.chapterNumber;
      if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
      if (parsed.data.content !== undefined) {
        let content = parsed.data.content.trim();
        content = sanitizeChapterContent(content);
        updateData.content = content;
        updateData.wordCount = countWords(content);
      }
    }

    const chapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: updateData,
      select: {
        id: true,
        novelId: true,
        chapterNumber: true,
        title: true,
        wordCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(chapter);
  } catch (error) {
    console.error('Update chapter error:', error);
    return serverErrorResponse('Gagal mengupdate chapter');
  }
}

// DELETE /api/chapters/:id — Delete chapter (admin only)
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const chapterId = parseInt(id, 10);
    if (isNaN(chapterId)) return errorResponse('ID chapter tidak valid', 400);

    const existing = await prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!existing) return notFoundResponse('Chapter tidak ditemukan');

    await prisma.$transaction(async (tx) => {
      await tx.chapter.delete({ where: { id: chapterId } });
      await tx.novel.update({
        where: { id: existing.novelId },
        data: { totalChapters: { decrement: 1 } },
      });
    });

    return successResponse({ message: 'Chapter berhasil dihapus' });
  } catch (error) {
    console.error('Delete chapter error:', error);
    return serverErrorResponse('Gagal menghapus chapter');
  }
}
