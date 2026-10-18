import { getCurrentUser, decodeTokenWithoutVerify, isAdminAbsoluteTimeoutExpired, SESSION_TIMEOUT_CONFIG } from './auth';
import { unauthorizedResponse, forbiddenResponse } from './api-response';
import type { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = UPSTASH_URL && UPSTASH_TOKEN ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : null;

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
 * Update admin's last activity timestamp in Redis.
 * Should only be called for admin actions that represent actual activity.
 */
export async function updateAdminActivity(userId: number): Promise<void> {
  if (!redis) {
    // Redis unavailable, but this should not prevent admin operations
    // Timeout will be enforced via absolute timeout only
    return;
  }

  try {
    // Use SET with EX option to automatically expire after 8 hours
    // This ensures we don't leave stale Redis keys around
    await redis.set(
      `novelku:admin:${userId}:lastActivity`,
      Date.now().toString(),
      { ex: SESSION_TIMEOUT_CONFIG.ADMIN_ABSOLUTE_SECONDS }
    );
  } catch (err) {
    console.error('Redis activity update failed:', err);
    // Fail silently - don't block admin actions due to Redis unavailability
    // Absolute timeout will still be enforced via JWT
  }
}

/**
 * Check admin session timeouts:
 * 1. Absolute timeout: 8 hours from JWT creation (checked via JWT issuedAt)
 * 2. Idle timeout: 2 hours since last Redis-recorded activity
 * 
 * Returns error response if either timeout is exceeded.
 */
async function validateAdminSession(userId: number, token: string): Promise<{ error: NextResponse } | null> {
  // Check absolute timeout via JWT
  const decodedToken = decodeTokenWithoutVerify(token);
  if (!decodedToken || !decodedToken.issuedAt) {
    return { error: unauthorizedResponse('Sesi admin tidak valid') };
  }

  // Check absolute timeout (8 hours from JWT creation)
  if (isAdminAbsoluteTimeoutExpired(decodedToken)) {
    return { error: unauthorizedResponse('Sesi admin telah berakhir (batas waktu absolut tercapai)') };
  }

  // Check idle timeout via Redis
  if (redis) {
    try {
      const lastActivityRaw = await redis.get<string>(`novelku:admin:${userId}:lastActivity`);
      if (lastActivityRaw) {
        const lastActivityMs = parseInt(String(lastActivityRaw));
        const now = Date.now();
        const idleMs = now - lastActivityMs;

        if (idleMs > SESSION_TIMEOUT_CONFIG.ADMIN_IDLE_MS) {
          // Idle timeout exceeded, clean up Redis key
          await redis.del(`novelku:admin:${userId}:lastActivity`);
          return { error: unauthorizedResponse('Sesi admin telah berakhir (tidak ada aktivitas selama 2 jam)') };
        }
      } else {
        // No activity recorded, treat as idle timeout
        return { error: unauthorizedResponse('Sesi admin tidak valid') };
      }
    } catch (err) {
      console.error('Redis validation error:', err);
      // If Redis is unavailable, we fail secure: require login
      return { error: unauthorizedResponse('Sesi admin tidak dapat divalidasi') };
    }
  } else {
    // Redis not configured - rely only on absolute timeout
    // No idle timeout enforcement without Redis
  }

  return null;
}

/**
 * Require authenticated admin with session timeout validation.
 * Returns user object or error response.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, error: unauthorizedResponse('Anda harus login terlebih dahulu') };
  }

  if (user.role !== 'ADMIN') {
    return { user: null, error: forbiddenResponse('Akses hanya untuk admin') };
  }

  // Admin-specific session validation
  const token = await getAuthToken();
  if (!token) {
    return { user: null, error: unauthorizedResponse('Sesi admin tidak valid') };
  }

  const validationError = await validateAdminSession(user.id, token);
  if (validationError) {
    return { user: null, error: validationError.error };
  }

  return { user, error: null };
}

// Helper to get auth token (copied from auth.ts to avoid circular dependency)
async function getAuthToken(): Promise<string | undefined> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return cookieStore.get('novelku_token')?.value;
}
