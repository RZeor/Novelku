import { removeAuthCookie } from '@/lib/auth';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

// ============================================================
// POST /api/auth/logout — Logout user
// ============================================================

export async function POST() {
  try {
    await removeAuthCookie();

    return successResponse({
      message: 'Logout berhasil',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return serverErrorResponse('Terjadi kesalahan saat logout');
  }
}
