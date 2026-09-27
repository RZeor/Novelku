import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guard';
import { updateGenreSchema } from '@/lib/validations/genre';
import { generateSlug } from '@/lib/utils';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  conflictResponse,
  serverErrorResponse,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

// PUT /api/genres/:id — Update genre (admin only)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const genreId = parseInt(id, 10);
    if (isNaN(genreId)) return errorResponse('ID genre tidak valid', 400);

    const body = await request.json();
    const parsed = updateGenreSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
    }

    const existing = await prisma.genre.findUnique({ where: { id: genreId } });
    if (!existing) return notFoundResponse('Genre tidak ditemukan');

    const { name } = parsed.data;
    const slug = generateSlug(name);

    // Check duplicate (exclude current)
    const duplicate = await prisma.genre.findFirst({
      where: {
        OR: [{ name }, { slug }],
        NOT: { id: genreId },
      },
    });
    if (duplicate) return conflictResponse('Nama genre sudah digunakan');

    const genre = await prisma.genre.update({
      where: { id: genreId },
      data: { name, slug },
      select: { id: true, name: true, slug: true },
    });

    return successResponse(genre);
  } catch (error) {
    console.error('Update genre error:', error);
    return serverErrorResponse('Gagal mengupdate genre');
  }
}

// DELETE /api/genres/:id — Delete genre (admin only)
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const genreId = parseInt(id, 10);
    if (isNaN(genreId)) return errorResponse('ID genre tidak valid', 400);

    const existing = await prisma.genre.findUnique({ where: { id: genreId } });
    if (!existing) return notFoundResponse('Genre tidak ditemukan');

    await prisma.genre.delete({ where: { id: genreId } });

    return successResponse({ message: 'Genre berhasil dihapus' });
  } catch (error) {
    console.error('Delete genre error:', error);
    return serverErrorResponse('Gagal menghapus genre');
  }
}
