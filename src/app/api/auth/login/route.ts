import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations/auth';
import { checkLoginRateLimit } from '@/lib/rate-limit';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  tooManyRequestsResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// ============================================================
// POST /api/auth/login — Login user
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Input tidak valid';
      return errorResponse(firstError, 400);
    }

    const { email, password } = parsed.data;

    // Rate limit: cegah brute-force berdasarkan kombinasi IP + email
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return unauthorizedResponse('Email atau password salah');
    }

    // Check if user is active
    if (!user.isActive) {
      return unauthorizedResponse('Akun Anda telah dinonaktifkan');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return unauthorizedResponse('Email atau password salah');
    }

    // Generate JWT and set cookie
    const token = generateToken({ userId: user.id, role: user.role });
    await setAuthCookie(token);

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
