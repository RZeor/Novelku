import { removeAuthCookie } from '@/lib/auth';
import { successResponse, serverErrorResponse } from '@/lib/api-response';
import { Redis } from '@upstash/redis';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = UPSTASH_URL && UPSTASH_TOKEN ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : null;

// ============================================================
// POST /api/auth/logout — Logout user
// ============================================================

export async function POST() {
  try {
    // If user was admin, clean up Redis activity data
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();
    
    if (user && user.role === 'ADMIN' && redis) {
      try {
        await redis.del(`novelku:admin:${user.id}:lastActivity`);
      } catch (err) {
        console.error('Redis cleanup on logout failed:', err);
        // Continue with logout even if Redis cleanup fails
      }
    }

    await removeAuthCookie();

    return successResponse({
      message: 'Logout berhasil',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return serverErrorResponse('Terjadi kesalahan saat logout');
  }
}
