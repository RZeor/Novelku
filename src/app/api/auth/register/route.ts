import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth';
import { registerSchema } from '@/lib/validations/auth';
import {
  createdResponse,
  errorResponse,
  conflictResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// ============================================================
// POST /api/auth/register — Register new user
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Input tidak valid';
      return errorResponse(firstError, 400);
    }

    const { username, email, password } = parsed.data;

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return conflictResponse('Username sudah digunakan');
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return conflictResponse('Email sudah digunakan');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'USER', // Always USER — never trust client-sent role
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Generate JWT with default 24-hour expiry (no Remember Me on registration)
    const token = generateToken({ userId: user.id, role: user.role }, false);
    
    // New user gets session cookie (no Remember Me by default)
    await setAuthCookie(token, {
      isSessionCookie: true,
    });

    return createdResponse({
      user,
      message: 'Registrasi berhasil',
    });
  } catch (error) {
    console.error('Register error:', error);
    return serverErrorResponse('Terjadi kesalahan saat registrasi');
  }
}
