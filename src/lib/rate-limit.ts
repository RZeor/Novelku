import { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ============================================================
// Rate Limiting (Upstash Redis)
// ------------------------------------------------------------
// Sliding window limiter berbasis kombinasi IP + identifier
// (mis. email) untuk mencegah brute-force pada endpoint auth.
//
// Env yang dibutuhkan (lihat .env.example):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// Jika env belum diisi, rate limiting di-skip (fail-open) agar
// aplikasi tetap berjalan tanpa konfigurasi Upstash.
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
 * Fail-open: jika Upstash tidak dikonfigurasi atau terjadi error
 * jaringan, request diizinkan agar tidak mengunci user karena
 * masalah infrastruktur.
 */
export async function checkLoginRateLimit(
  request: NextRequest,
  identifier: string
): Promise<RateLimitResult> {
  if (!loginRateLimit) return ALLOW;

  const ip = getClientIp(request);
  const normalizedIdentifier = identifier.trim().toLowerCase();

  try {
    const [byIp, byIdentifier] = await Promise.all([
      loginRateLimit.limit(`ip:${ip}`),
      loginRateLimit.limit(`id:${normalizedIdentifier}`),
    ]);

    const results = [byIp, byIdentifier];

    // Jika salah satu gagal, tolak dan pilih hasil paling ketat.
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
    console.error('Rate limit check error:', error);
    return ALLOW;
  }
}
