import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { createChapterSchema } from '@/lib/validations/chapter';
import { countWords } from '@/lib/utils';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundResponse,
  conflictResponse,
  serverErrorResponse,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

// GET /api/novels/:id/chapters — List chapters of a novel
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const novel = await prisma.novel.findUnique({ where: { id: novelId } });
    if (!novel) return notFoundResponse('Novel tidak ditemukan');

    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      orderBy: { chapterNumber: 'asc' },
      select: {
        id: true,
        novelId: true,
        chapterNumber: true,
        title: true,
        wordCount: true,
        createdAt: true,
      },
    });

    return successResponse(chapters);
  } catch (error) {
    console.error('Get chapters error:', error);
    return serverErrorResponse('Gagal mengambil data chapter');
  }
}

// POST /api/novels/:id/chapters — Create chapter (admin only)
// Supports JSON body with content field (text from .txt file read on client)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const novelId = parseInt(id, 10);
    if (isNaN(novelId)) return errorResponse('ID novel tidak valid', 400);

    const novel = await prisma.novel.findUnique({ where: { id: novelId } });
    if (!novel) return notFoundResponse('Novel tidak ditemukan');

    // Support both FormData (file upload) and JSON body
    const contentType = request.headers.get('content-type') || '';
    let chapterNumber: number;
    let title: string;
    let content: string;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const chapterNumberStr = formData.get('chapterNumber') as string;
      const titleStr = formData.get('title') as string;

      if (!file) return errorResponse('File .txt wajib di-upload', 400);
      if (!file.name.endsWith('.txt')) return errorResponse('Hanya file .txt yang diperbolehkan', 400);

      // Validate file size (max 5MB)
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) return errorResponse('Ukuran file maksimal 5MB', 400);

      content = await file.text();
      chapterNumber = parseInt(chapterNumberStr, 10);
      title = titleStr;
    } else {
      // Handle JSON body
      const body = await request.json();
      const parsed = createChapterSchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
      }
      chapterNumber = parsed.data.chapterNumber;
      title = parsed.data.title;
      content = parsed.data.content;
    }

    // Validate extracted data
    if (!chapterNumber || isNaN(chapterNumber) || chapterNumber < 1) {
      return errorResponse('Nomor chapter harus bilangan bulat positif', 400);
    }
    if (!title || title.trim().length === 0) {
      return errorResponse('Judul chapter wajib diisi', 400);
    }
    if (!content || content.trim().length === 0) {
      return errorResponse('Konten chapter wajib diisi', 400);
    }

    // Check duplicate chapter number
    const existingChapter = await prisma.chapter.findUnique({
      where: { novelId_chapterNumber: { novelId, chapterNumber } },
    });
    if (existingChapter) {
      return conflictResponse(`Chapter ${chapterNumber} sudah ada untuk novel ini`);
    }

    const wordCount = countWords(content);

    // Create chapter and update novel's totalChapters
    const chapter = await prisma.$transaction(async (tx) => {
      const newChapter = await tx.chapter.create({
        data: {
          novelId,
          chapterNumber,
          title: title.trim(),
          content,
          wordCount,
        },
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

      await tx.novel.update({
        where: { id: novelId },
        data: { totalChapters: { increment: 1 } },
      });

      return newChapter;
    });

    return createdResponse(chapter);
  } catch (error) {
    console.error('Create chapter error:', error);
    return serverErrorResponse('Gagal membuat chapter');
  }
}
