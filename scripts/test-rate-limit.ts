/**
 * Test Suite: Rate Limiting (Upstash Redis)
 * ------------------------------------------------------------
 * Menguji modul `src/lib/rate-limit.ts`:
 *   1. Konfigurasi Upstash terbaca dari .env
 *   2. Ekstraksi IP dari berbagai header proxy
 *   3. Sliding window memblokir setelah N percobaan (per IP)
 *   4. Isolasi per-identifier (email) — akun lain tidak terpengaruh
 *   5. Konsistensi response shape (limit / remaining / reset)
 *
 * Jalankan (dari root project):
 *   npx tsx scripts/test-rate-limit.ts
 *
 * Opsional:
 *   RATE_LIMIT_TEST_LIMIT=5   (harus sama dengan limit di rate-limit.ts)
 */

import { loadEnvConfig } from '@next/env';
// PENTING: muat .env SEBELUM modul rate-limit diimpor, karena modul itu
// membaca process.env saat dievaluasi. Import dinamis dipakai agar
// loadEnvConfig benar-benar berjalan lebih dulu (import statis di-hoist).
loadEnvConfig(process.cwd(), true);

import { NextRequest } from 'next/server';
import type {
  checkLoginRateLimit as CheckLoginRateLimitFn,
  getClientIp as GetClientIpFn,
} from '../src/lib/rate-limit';

// Dimuat setelah env tersedia.
let checkLoginRateLimit: typeof CheckLoginRateLimitFn;
let getClientIp: typeof GetClientIpFn;
let isRateLimitConfigured: boolean;

// ============================================================
// Mini test harness
// ============================================================

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  process.stdout.write(`⏳ ${name}... `);
  try {
    await fn();
    console.log('✅ PASSED');
    passed++;
  } catch (err) {
    console.log('❌ FAILED');
    const message = err instanceof Error ? err.message : String(err);
    console.error(`   └─ ${message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/** Konstruksi NextRequest dengan header tertentu. */
function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers,
  });
}

/** Suffix unik agar setiap test run memakai key Redis yang belum terpakai. */
const uniqueSuffix = Date.now().toString(36);
const LIMIT = Number(process.env.RATE_LIMIT_TEST_LIMIT || 5);

/** Interval window (ms) di rate-limit.ts = 1 menit. */
const WINDOW_MS = 60_000;

async function main() {
  console.log('\n🧪 Rate Limit Test Suite — Novelku');
  console.log('===========================================================\n');

  // Muat modul rate-limit setelah .env tersedia.
  const mod = await import('../src/lib/rate-limit');
  checkLoginRateLimit = mod.checkLoginRateLimit;
  getClientIp = mod.getClientIp;
  isRateLimitConfigured = mod.isRateLimitConfigured;

  // ----------------------------------------------------------
  // 1. Konfigurasi
  // ----------------------------------------------------------
  await test('Upstash terkonfigurasi via .env', async () => {
    assert(
      isRateLimitConfigured,
      'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN belum diisi di .env'
    );
  });

  if (!isRateLimitConfigured) {
    console.log('\n⚠️  Upstash belum dikonfigurasi — sisa test dilewati.');
    console.log('   Isi UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN di .env\n');
    process.exit(1);
  }

  // ----------------------------------------------------------
  // 2. Ekstraksi IP dari header
  // ----------------------------------------------------------
  await test('getClientIp: x-forwarded-for (daftar) mengambil IP pertama', () => {
    const req = makeRequest({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' });
    assertEqual(getClientIp(req), '203.0.113.7', 'x-forwarded-for');
  });

  await test('getClientIp: fallback ke x-real-ip', () => {
    const req = makeRequest({ 'x-real-ip': '198.51.100.42' });
    assertEqual(getClientIp(req), '198.51.100.42', 'x-real-ip');
  });

  await test('getClientIp: fallback ke cf-connecting-ip', () => {
    const req = makeRequest({ 'cf-connecting-ip': '192.0.2.9' });
    assertEqual(getClientIp(req), '192.0.2.9', 'cf-connecting-ip');
  });

  await test('getClientIp: "unknown" jika tidak ada header IP', () => {
    const req = makeRequest({});
    assertEqual(getClientIp(req), 'unknown', 'no header');
  });

  // ----------------------------------------------------------
  // 3. Sliding window memblokir setelah N percobaan
  // ----------------------------------------------------------
  const ipA = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
  const emailA = `ratelimit_a_${uniqueSuffix}@example.com`;
  const reqA = makeRequest({
    'x-forwarded-for': ipA,
    'x-real-ip': ipA,
  });

  await test(`Percobaan ke-1..${LIMIT} diizinkan (success = true)`, async () => {
    for (let i = 1; i <= LIMIT; i++) {
      const r = await checkLoginRateLimit(reqA, emailA);
      assert(r.success, `Percobaan ke-${i} seharusnya diizinkan, tapi diblokir`);
    }
  });

  await test(`Percobaan ke-${LIMIT + 1} diblokir (success = false)`, async () => {
    const r = await checkLoginRateLimit(reqA, emailA);
    assert(!r.success, `Percobaan ke-${LIMIT + 1} seharusnya diblokir`);
  });

  await test('Response memuat limit, remaining, dan reset yang valid', async () => {
    const r = await checkLoginRateLimit(reqA, emailA);
    assert(r.limit > 0, `limit harus > 0, got ${r.limit}`);
    assert(r.remaining <= 0, `remaining harus <= 0 saat diblokir, got ${r.remaining}`);
    assert(r.reset > Date.now(), `reset harus di masa depan, got ${r.reset}`);
    assert(
      r.reset - Date.now() <= WINDOW_MS + 5_000,
      `reset tidak boleh melebihi window (${WINDOW_MS}ms)`
    );
  });

  // ----------------------------------------------------------
  // 4. Isolasi per-identifier (email)
  // ----------------------------------------------------------
  const ipB = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
  const emailB = `ratelimit_b_${uniqueSuffix}@example.com`;
  const reqB = makeRequest({ 'x-forwarded-for': ipB, 'x-real-ip': ipB });

  await test('Email berbeda dengan IP berbeda tidak terpengaruh', async () => {
    const r = await checkLoginRateLimit(reqB, emailB);
    assert(r.success, 'Email/IP baru seharusnya diizinkan (counter terisolasi)');
  });

  await test('Kombinasi email-terblokir dengan IP baru tetap diblokir (email-locked)', async () => {
    // emailA sudah limit; pakai IP baru untuk memastikan email tetap jadi kunci
    const freshIp = `203.0.114.${Math.floor(Math.random() * 200) + 1}`;
    const reqFreshIp = makeRequest({ 'x-forwarded-for': freshIp, 'x-real-ip': freshIp });
    const r = await checkLoginRateLimit(reqFreshIp, emailA);
    assert(!r.success, 'Email yang sudah limit harus tetap diblokir meski dari IP baru');
  });

  // ----------------------------------------------------------
  // 5. Normalisasi identifier (case-insensitive)
  // ----------------------------------------------------------
  await test('Email case-insensitive: EMAIL_A + emailA berbagi counter yang sama', async () => {
    const freshIp = `203.0.115.${Math.floor(Math.random() * 200) + 1}`;
    const reqFreshIp = makeRequest({ 'x-forwarded-for': freshIp, 'x-real-ip': freshIp });
    const r = await checkLoginRateLimit(reqFreshIp, emailA.toUpperCase());
    assert(!r.success, 'Email uppercase harus memakai counter yang sama (sudah limit)');
  });

  // ----------------------------------------------------------
  // Ringkasan
  // ----------------------------------------------------------
  console.log('\n===========================================================');
  console.log(`Hasil: ${passed} passed, ${failed} failed`);
  console.log('===========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n💥 Test runner error:', err);
  process.exit(1);
});
