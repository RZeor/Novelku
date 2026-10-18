import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, updateAdminActivity } from '@/lib/auth-guard';
import { createGenreSchema } from '@/lib/validations/genre';
import { generateSlug } from '@/lib/utils';
import {
  successResponse,
  createdResponse,
  errorResponse,
  conflictResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// GET /api/genres — List all genres
export async function GET() {
  try {
    const genres = await prisma.genre.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return successResponse(genres);
  } catch (error) {
    console.error('Get genres error:', error);
    return serverErrorResponse('Gagal mengambil data genre');
  }
}

// POST /api/genres — Create genre (admin only)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const parsed = createGenreSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Input tidak valid', 400);
    }

    const { name } = parsed.data;
    const slug = generateSlug(name);

    // Check duplicate
    const existing = await prisma.genre.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) {
      return conflictResponse('Genre sudah ada');
    }

    const genre = await prisma.genre.create({
      data: { name, slug },
      select: { id: true, name: true, slug: true },
    });

    // Update admin activity on successful mutation
    await updateAdminActivity(user!.id);

    return createdResponse(genre);
  } catch (error) {
    console.error('Create genre error:', error);
    return serverErrorResponse('Gagal membuat genre');
  }
}
