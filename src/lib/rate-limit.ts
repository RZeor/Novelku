import { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ============================================================
// Rate Limiting (Upstash Redis with In-Memory Fallback)
// ------------------------------------------------------------
// Sliding window limiter berbasis kombinasi IP + identifier
// (mis. email) untuk mencegah brute-force pada endpoint auth.
//
// Env yang dibutuhkan (lihat .env.example):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// Fail-secure: jika env belum diisi atau Redis error, gunakan
// in-memory limiter sebagai fallback untuk tetap melindungi dari brute-force.
// ============================================================

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** True jika Upstash dikonfigurasi lewat environment variable. */
export const isRateLimitConfigured = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

/**
 * Redis client singleton (dibuat di module scope agar tidak
 * membuat koneksi baru setiap hot-reload / invocation).
 */
const redis = isRateLimitConfigured
  ? new Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! })
  : null;

/**
 * Limiter untuk percobaan login:
 * maks 5 percobaan per 1 menit (sliding window) per IP dan per email.
 */
export const loginRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'novelku:ratelimit:login',
      // Instance dibuat di module scope sehingga cache ephemeral
      // bisa memblokir identifier yang sudah limit tanpa hit Redis.
      analytics: false,
    })
  : null;

/**
 * In-memory rate limit limiter sebagai fallback ketika Redis tidak tersedia.
 * Menyimpan timestamps request per key dengan sliding window 60 detik.
 * Max 5 requests per window sesuai dengan loginRateLimit config.
 */
const memoryLimitCache = new Map<string, number[]>();
const MEMORY_LIMIT_MAX_REQUESTS = 5;
const MEMORY_LIMIT_WINDOW_MS = 60 * 1000;
const MEMORY_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000;

function checkMemoryRateLimit(key: string): boolean {
  const now = Date.now();
  let timestamps = memoryLimitCache.get(key) || [];

  timestamps = timestamps.filter((t) => now - t < MEMORY_LIMIT_WINDOW_MS);

  if (timestamps.length >= MEMORY_LIMIT_MAX_REQUESTS) {
    memoryLimitCache.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  memoryLimitCache.set(key, timestamps);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of memoryLimitCache.entries()) {
    const active = timestamps.filter((t) => now - t < MEMORY_LIMIT_WINDOW_MS);
    if (active.length === 0) {
      memoryLimitCache.delete(key);
    } else {
      memoryLimitCache.set(key, active);
    }
  }
}, MEMORY_LIMIT_CLEANUP_INTERVAL);

/**
 * Ambil alamat IP pengirim request dari header proxy.
 * `request.ip` sudah dihapus sejak Next.js 15, jadi kita baca header.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Header bisa berisi daftar "client, proxy1, proxy2" — ambil yang pertama.
    return forwardedFor.split(',')[0].trim();
  }
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

export interface RateLimitResult {
  /** True jika request masih boleh diproses. */
  success: boolean;
  /** Jumlah request tersisa pada window saat ini. */
  remaining: number;
  /** Unix timestamp (ms) kapan limit di-reset. */
  reset: number;
  /** Batas maksimum request per window. */
  limit: number;
}

const ALLOW: RateLimitResult = {
  success: true,
  remaining: Number.MAX_SAFE_INTEGER,
  reset: 0,
  limit: 0,
};

/**
 * Cek rate limit untuk sebuah aksi (mis. login) berdasarkan
 * kombinasi IP + identifier (mis. email).
 *
 * Counters IP dan identifier diperiksa terpisah lalu digabung:
 * request ditolak jika salah satunya sudah melewati limit.
 * Hasil yang paling ketat (paling cepat reset / sisa paling kecil)
 * dikembalikan.
 *
 * Fail-secure: jika Upstash tidak dikonfigurasi atau terjadi error,
 * gunakan in-memory fallback limiter untuk tetap melindungi dari brute-force.
 */
export async function checkLoginRateLimit(
  request: NextRequest,
  identifier: string
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const normalizedIdentifier = identifier.trim().toLowerCase();

  if (loginRateLimit) {
    try {
      const [byIp, byIdentifier] = await Promise.all([
        loginRateLimit.limit(`ip:${ip}`),
        loginRateLimit.limit(`id:${normalizedIdentifier}`),
      ]);

      const results = [byIp, byIdentifier];

      const success = results.every((r) => r.success);
      const strictest = results.reduce((acc, r) =>
        r.remaining < acc.remaining ? r : acc
      );

      return {
        success,
        remaining: strictest.remaining,
        reset: Math.max(...results.map((r) => r.reset)),
        limit: strictest.limit,
      };
    } catch (error) {
      console.error('Redis rate limit check failed, falling back to in-memory limiter:', error);
    }
  }

  const ipAllowed = checkMemoryRateLimit(`ip:${ip}`);
  const idAllowed = checkMemoryRateLimit(`id:${normalizedIdentifier}`);
  const success = ipAllowed && idAllowed;

  return {
    success,
    remaining: success ? MEMORY_LIMIT_MAX_REQUESTS - 1 : 0,
    reset: Date.now() + MEMORY_LIMIT_WINDOW_MS,
    limit: MEMORY_LIMIT_MAX_REQUESTS,
  };
}
