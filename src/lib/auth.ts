import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 12;

// Session timeout constants (in milliseconds)
const SESSION_TIMEOUTS = {
  USER_DEFAULT: 24 * 60 * 60 * 1000, // 24 hours
  USER_REMEMBER_ME: 30 * 24 * 60 * 60 * 1000, // 30 days
  ADMIN_ABSOLUTE: 8 * 60 * 60 * 1000, // 8 hours
  ADMIN_IDLE: 2 * 60 * 60 * 1000, // 2 hours
};

// ============================================================
// Password Hashing
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ============================================================
// JWT Token
// ============================================================

export interface JwtPayload {
  userId: number;
  role: string;
  rememberMe?: boolean;
  issuedAt?: number;
}

export function calculateTokenExpiry(
  role: string,
  rememberMe?: boolean
): number {
  if (role === 'ADMIN') {
    return SESSION_TIMEOUTS.ADMIN_ABSOLUTE / 1000; // Convert to seconds for JWT
  }
  if (rememberMe) {
    return SESSION_TIMEOUTS.USER_REMEMBER_ME / 1000;
  }
  return SESSION_TIMEOUTS.USER_DEFAULT / 1000;
}

export function generateToken(
  payload: JwtPayload,
  rememberMe?: boolean
): string {
  const expiresIn = calculateTokenExpiry(payload.role, rememberMe);
  const issuedAt = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      ...payload,
      rememberMe: rememberMe || false,
      issuedAt,
    },
    JWT_SECRET,
    {
      expiresIn,
    }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Decode JWT without verification (for reading issuedAt timestamp only).
 * ONLY use for reading timestamp data that was signed at creation time.
 * Should never be used for authorization decisions.
 */
export function decodeTokenWithoutVerify(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token);
    return decoded as JwtPayload;
  } catch {
    return null;
  }
}

// ============================================================
// Session Management (Cookie-based JWT)
// ============================================================

const COOKIE_NAME = 'novelku_token';

interface CookieOptions {
  maxAge?: number;
  isSessionCookie?: boolean;
}

function buildCookieOptions(options: CookieOptions = {}) {
  const { maxAge, isSessionCookie } = options;
  
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };

  // For session cookies (no Remember Me), don't set maxAge/expires
  // Browser will delete when session ends
  if (isSessionCookie) {
    return baseOptions;
  }

  return {
    ...baseOptions,
    maxAge,
  };
}

export async function setAuthCookie(
  token: string,
  options: CookieOptions = {}
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, buildCookieOptions(options));
}

export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

// ============================================================
// Get Current User from Request
// ============================================================

export async function getCurrentUser() {
  const token = await getAuthToken();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) return null;

  return user;
}

// ============================================================
// Admin Session Timeout Validation
// ============================================================

/**
 * Check if admin session has exceeded the 8-hour absolute timeout.
 * Uses the `issuedAt` claim embedded in the JWT at creation time.
 * This is resilient to cookie tampering because 'issuedAt' is signed.
 */
export function isAdminAbsoluteTimeoutExpired(payload: JwtPayload): boolean {
  if (!payload.issuedAt) {
    // No issuedAt claim = invalid token structure, reject
    return true;
  }
  
  const now = Date.now();
  const issuedAtMs = payload.issuedAt * 1000;
  const ageMs = now - issuedAtMs;
  
  return ageMs > SESSION_TIMEOUTS.ADMIN_ABSOLUTE;
}

/**
 * Get the timeout constants for use in other modules.
 */
export const SESSION_TIMEOUT_CONFIG = {
  USER_DEFAULT_SECONDS: SESSION_TIMEOUTS.USER_DEFAULT / 1000,
  USER_REMEMBER_ME_SECONDS: SESSION_TIMEOUTS.USER_REMEMBER_ME / 1000,
  ADMIN_ABSOLUTE_SECONDS: SESSION_TIMEOUTS.ADMIN_ABSOLUTE / 1000,
  ADMIN_IDLE_SECONDS: SESSION_TIMEOUTS.ADMIN_IDLE / 1000,
  ADMIN_ABSOLUTE_MS: SESSION_TIMEOUTS.ADMIN_ABSOLUTE,
  ADMIN_IDLE_MS: SESSION_TIMEOUTS.ADMIN_IDLE,
};
