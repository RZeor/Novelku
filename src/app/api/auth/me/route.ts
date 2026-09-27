import { getCurrentUser } from '@/lib/auth';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/api-response';

// ============================================================
// GET /api/auth/me — Get current logged-in user
// ============================================================

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse('Anda belum login');
    }

    return successResponse({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    return serverErrorResponse('Terjadi kesalahan');
  }
}
