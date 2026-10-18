import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateToken, setAuthCookie, SESSION_TIMEOUT_CONFIG } from '@/lib/auth';
import { loginSchema } from '@/lib/validations/auth';
import { checkLoginRateLimit } from '@/lib/rate-limit';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  tooManyRequestsResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { Redis } from '@upstash/redis';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = UPSTASH_URL && UPSTASH_TOKEN ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : null;

// ============================================================
// POST /api/auth/login — Login user
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Input tidak valid';
      return errorResponse(firstError, 400);
    }

    const { email, password, rememberMe } = parsed.data;

    const rateLimit = await checkLoginRateLimit(request, email);
    if (!rateLimit.success) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rateLimit.reset - Date.now()) / 1000)
      );
      return tooManyRequestsResponse(
        'Terlalu banyak percobaan login. Silakan coba lagi nanti.',
        retryAfterSeconds
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return unauthorizedResponse('Email atau password salah');
    }

    if (!user.isActive) {
      return unauthorizedResponse('Akun Anda telah dinonaktifkan');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return unauthorizedResponse('Email atau password salah');
    }

    // Generate JWT with appropriate expiry based on role and rememberMe
    // For admins, rememberMe is ignored (always 8-hour absolute timeout)
    const shouldRemember = user.role === 'ADMIN' ? false : rememberMe;
    const token = generateToken({ userId: user.id, role: user.role }, shouldRemember);

    // Determine cookie options based on session type
    let cookieOptions: { maxAge?: number; isSessionCookie?: boolean } = {};
    if (user.role === 'ADMIN') {
      // Admin: persistent cookie with 8-hour maxAge
      cookieOptions = {
        maxAge: SESSION_TIMEOUT_CONFIG.ADMIN_ABSOLUTE_SECONDS,
        isSessionCookie: false,
      };
    } else if (shouldRemember) {
      // Regular user with Remember Me: persistent cookie with 30-day maxAge
      cookieOptions = {
        maxAge: SESSION_TIMEOUT_CONFIG.USER_REMEMBER_ME_SECONDS,
        isSessionCookie: false,
      };
    } else {
      // Regular user without Remember Me: session cookie (no maxAge)
      cookieOptions = {
        isSessionCookie: true,
      };
    }

    await setAuthCookie(token, cookieOptions);

    // For admin login, initialize lastActivityAt in Redis
    if (user.role === 'ADMIN' && redis) {
      try {
        await redis.set(
          `novelku:admin:${user.id}:lastActivity`,
          Date.now().toString(),
          { ex: SESSION_TIMEOUT_CONFIG.ADMIN_ABSOLUTE_SECONDS }
        );
      } catch (err) {
        console.error('Redis admin activity init failed:', err);
        // Don't fail login if Redis is unavailable, but log the issue
      }
    }

    return successResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      message: 'Login berhasil',
    });
  } catch (error) {
    console.error('Login error:', error);
    return serverErrorResponse('Terjadi kesalahan saat login');
  }
}
