import { getCurrentUser } from './auth';
import { unauthorizedResponse, forbiddenResponse } from './api-response';

// ============================================================
// Auth Guards for API Routes
// ============================================================

/**
 * Require authenticated user. Returns user object or error response.
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, error: unauthorizedResponse('Anda harus login terlebih dahulu') };
  }

  return { user, error: null };
}

/**
 * Require authenticated admin. Returns user object or error response.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, error: unauthorizedResponse('Anda harus login terlebih dahulu') };
  }

  if (user.role !== 'ADMIN') {
    return { user: null, error: forbiddenResponse('Akses hanya untuk admin') };
  }

  return { user, error: null };
}
