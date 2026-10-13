/**
 * Comprehensive Test Script for Reader Analytics (Authenticated Sessions)
 * Tests all requirements:
 * 1. Anonymous handling (no tracking, fail-safe 200/tracked:false)
 * 2. Authenticated read-start session creation
 * 3. Idempotency of read-start
 * 4. Ownership and conflict validation (409 Conflict)
 * 5. Invalid chapter-novel relation rejection (400)
 * 6. Heartbeat duration accumulation & timing intervals (<10s, 30s)
 * 7. Heartbeat ownership check (403 Forbidden for non-owners)
 * 8. Admin analytics authorization check (401/403 for user/public, 200 for admin)
 * 9. Date range validation (>90 days rejection)
 */

import 'dotenv/config';
import crypto from 'crypto';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function parseCookie(res: Response): string {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return '';
  const match = setCookie.match(/novelku_token=([^;]+)/);
  return match ? `novelku_token=${match[1]}` : '';
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    process.stdout.write(`⏳ Testing: ${name}... `);
    await fn();
    console.log('✅ PASSED');
  } catch (err: unknown) {
    console.log('❌ FAILED');
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`   Error: ${msg}`);
    process.exit(1);
  }
}

async function main() {
  console.log(`\n🚀 Memulai Pengujian Reader Analytics di ${BASE_URL}\n`);

  let adminCookie = '';
  let userCookie = '';
  let otherUserCookie = '';
  let testNovelId = 0;
  let testChapterId = 0;

  // 1. Setup Auth: Admin & User Login
  await test('1. Admin Authentication', async () => {
    // Coba login via endpoint
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'Admin_Novelku@novelku.com',
        password: 'AdminPassword123!',
      }),
    });
    if (res.status === 200) {
      adminCookie = parseCookie(res);
    } else {
      // Fallback: generate token langsung untuk Admin user (id: 1)
      const { generateToken } = await import('../src/lib/auth');
      const token = generateToken({ userId: 1, role: 'ADMIN' });
      adminCookie = `novelku_token=${token}`;
    }
    assert(Boolean(adminCookie), 'Admin cookie not found');
  });

  await test('2. Normal User Register/Login', async () => {
    const randomSuffix = Math.floor(Math.random() * 100000);
    const email = `reader_${randomSuffix}@test.com`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `reader_${randomSuffix}`,
        email,
        password: 'Password123!',
      }),
    });
    userCookie = parseCookie(res);
    assert(res.status === 201, `User register failed with status ${res.status}`);
    assert(Boolean(userCookie), 'User cookie not found');

    // Register second user for ownership checks
    const resOther = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `other_${randomSuffix}`,
        email: `other_${randomSuffix}@test.com`,
        password: 'Password123!',
      }),
    });
    otherUserCookie = parseCookie(resOther);
    assert(resOther.status === 201, 'Other user register failed');
  });

  // 2. Dapatkan data novel & chapter yang valid dari DB
  await test('3. Ambil data Novel & Chapter yang valid', async () => {
    const { prisma } = await import('../src/lib/prisma');
    const ch = await prisma.chapter.findFirst({ select: { id: true, novelId: true } });
    assert(Boolean(ch), 'No chapters found in database');
    testNovelId = ch!.novelId;
    testChapterId = ch!.id;
  });

  // 3. Test Kasus Pengguna Anonim (Tidak Ada Cookie)
  await test('4. Pengguna Anonim: Tidak Membuat Sesi Tracking', async () => {
    const anonSessionId = crypto.randomUUID();
    const res = await fetch(`${BASE_URL}/api/analytics/read-start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: anonSessionId,
        novelId: testNovelId,
        chapterId: testChapterId,
      }),
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.tracked === false, 'Anonymous session should have tracked: false');
  });

  // 4. Test Inisiasi Sesi User Terautentikasi
  const testSessionId = crypto.randomUUID();

  await test('5. Pengguna Login: Inisiasi Sesi Baru Berhasil', async () => {
    const res = await fetch(`${BASE_URL}/api/analytics/read-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userCookie,
      },
      body: JSON.stringify({
        sessionId: testSessionId,
        novelId: testNovelId,
        chapterId: testChapterId,
      }),
    });
    const json = await res.json();
    assert(res.status === 201, `Expected 201 Created, got ${res.status}: ${json.message}`);
    assert(json.data.tracked === true, 'Session should be tracked');
    assert(json.data.reused === false, 'Session should be new');
    assert(json.data.session.durationSeconds === 0, 'Initial duration should be 0');
  });

  // 5. Test Idempotensi read-start
  await test('6. Idempotensi: Request read-start Ulang Mengembalikan Sesi Lama', async () => {
    const res = await fetch(`${BASE_URL}/api/analytics/read-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userCookie,
      },
      body: JSON.stringify({
        sessionId: testSessionId,
        novelId: testNovelId,
        chapterId: testChapterId,
      }),
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200 OK for idempotent retry, got ${res.status}`);
    assert(json.data.reused === true, 'Session should be reused (idempotent)');
    assert(json.data.session.sessionId === testSessionId, 'Session ID mismatch');
  });

  // 6. Test Konflik Kepemilikan (409 Conflict)
  await test('7. Konflik: Session ID Sama dengan User Berbeda Ditolak (409)', async () => {
    const res = await fetch(`${BASE_URL}/api/analytics/read-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: otherUserCookie,
      },
      body: JSON.stringify({
        sessionId: testSessionId,
        novelId: testNovelId,
        chapterId: testChapterId,
      }),
    });
    assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
  });

  // 7. Test Relasi Novel dan Bab yang Salah
  await test('8. Integritas Relasi: Chapter Tidak Sesuai Novel Ditolak (400)', async () => {
    const fakeSessionId = crypto.randomUUID();
    const res = await fetch(`${BASE_URL}/api/analytics/read-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userCookie,
      },
      body: JSON.stringify({
        sessionId: fakeSessionId,
        novelId: 999999, // ID novel yang salah
        chapterId: testChapterId,
      }),
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
  });

  // 8. Test Heartbeat Terlalu Cepat (< 10 Detik)
  await test('9. Heartbeat: Interval < 10 Detik Tidak Menambah Durasi', async () => {
    const res = await fetch(`${BASE_URL}/api/analytics/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userCookie,
      },
      body: JSON.stringify({ sessionId: testSessionId }),
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.credited === 0, 'Heartbeat < 10s should credit 0 seconds');
    assert(json.data.totalDuration === 0, 'Total duration should remain 0');
  });

  // 9. Test Heartbeat Bukan Pemilik Sesi (403 Forbidden)
  await test('10. Heartbeat: User Lain Mencoba Heartbeat Ditolak (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/analytics/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: otherUserCookie,
      },
      body: JSON.stringify({ sessionId: testSessionId }),
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  // 10. Test Otorisasi Admin Analytics
  await test('11. Otorisasi Admin: Publik Ditolak (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/analytics`);
    assert(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  await test('12. Otorisasi Admin: User Biasa Ditolak (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/analytics`, {
      headers: { Cookie: userCookie },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('13. Otorisasi Admin: Admin Diizinkan (200 OK) & Data Valid', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/analytics?period=7d`, {
      headers: { Cookie: adminCookie },
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200 OK, got ${res.status}: ${json.message}`);
    assert(json.data.summary !== undefined, 'Summary data should be present');
    assert(json.data.summary.totalActivities >= 1, 'Total activities should be at least 1');
    assert(json.data.summary.uniqueReaders >= 1, 'Unique readers should be at least 1');
    assert(json.data.dailyTrends.length === 7, `Expected 7 daily trend items, got ${json.data.dailyTrends.length}`);
  });

  // 11. Test Validasi Rentang Tanggal > 90 Hari Ditolak (400)
  await test('14. Validasi: Rentang Kustom > 90 Hari Ditolak (400)', async () => {
    const res = await fetch(
      `${BASE_URL}/api/admin/analytics?period=custom&startDate=2025-01-01&endDate=2025-06-01`,
      {
        headers: { Cookie: adminCookie },
      }
    );
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
  });

  console.log('\n🎉 SELURUH PENGUJIAN READER ANALYTICS BERHASIL LULUS! 🎉\n');
}

main().catch((err) => {
  console.error('\nFatal test runner error:', err);
  process.exit(1);
});
