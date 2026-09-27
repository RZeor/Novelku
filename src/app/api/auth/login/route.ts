import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations/auth';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
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
