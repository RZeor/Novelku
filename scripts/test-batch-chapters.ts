/**
 * Automated Verification Test for Batch Chapters Feature
 * Tests:
 * 1. Admin Authentication
 * 2. Successful batch upload of multiple chapters
 * 3. Atomic Novel.totalChapters increment
 * 4. Duplicate chapter numbers rejection (409 Conflict)
 * 5. Intra-batch duplicate rejection (400 Bad Request)
 * 6. Role protection (401 / 403)
 */

import 'dotenv/config';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

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
  console.log(`\n🚀 Memulai Pengujian Batch Add Chapters di ${BASE_URL}\n`);

  let adminCookie = '';
  let userCookie = '';
  let testNovelId = 0;
  let startChapterNumber = 0;
  let initialTotalChapters = 0;

  // 1. Setup Auth
  await test('1. Admin Authentication', async () => {
    const { generateToken } = await import('../src/lib/auth');
    const token = generateToken({ userId: 1, role: 'ADMIN' });
    adminCookie = `novelku_token=${token}`;
    assert(Boolean(adminCookie), 'Admin cookie could not be generated');

    const resReg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `user_${Date.now()}`,
        email: `batch_user_${Date.now()}@test.com`,
        password: 'Password123!',
      }),
    });
    const setCookie = resReg.headers.get('set-cookie');
    const match = setCookie?.match(/novelku_token=([^;]+)/);
    userCookie = match ? `novelku_token=${match[1]}` : '';
    assert(Boolean(userCookie), 'User cookie could not be obtained');
  });

  // 2. Temukan novel untuk pengujian
  await test('2. Dapatkan Novel Uji dari Database', async () => {
    const { prisma } = await import('../src/lib/prisma');
    const novel = await prisma.novel.findFirst({
      select: { id: true, totalChapters: true },
    });
    assert(Boolean(novel), 'No novel found for testing');
    testNovelId = novel!.id;
    initialTotalChapters = novel!.totalChapters;

    // Cari max chapter number
    const maxChapter = await prisma.chapter.findFirst({
      where: { novelId: testNovelId },
      orderBy: { chapterNumber: 'desc' },
      select: { chapterNumber: true },
    });
    startChapterNumber = (maxChapter?.chapterNumber || 0) + 100; // Mulai dari offset tinggi agar aman
  });

  // 3. Test Unauthorized & Forbidden Access
  await test('3. Otorisasi: Publik ditolak (401) dan User ditolak (403)', async () => {
    // Publik
    const resPub = await fetch(`${BASE_URL}/api/novels/${testNovelId}/chapters/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapters: [] }),
    });
    assert(resPub.status === 401, `Expected 401, got ${resPub.status}`);

    // User biasa
    const resUser = await fetch(`${BASE_URL}/api/novels/${testNovelId}/chapters/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userCookie,
      },
      body: JSON.stringify({ chapters: [] }),
    });
    assert(resUser.status === 403, `Expected 403, got ${resUser.status}`);
  });

  // 4. Test Sukses Menambahkan 3 Chapter Sekaligus
  const newChapters = [
    {
      chapterNumber: startChapterNumber,
      title: `Chapter ${startChapterNumber}: Awal Mula Petualangan`,
      content: 'Ini adalah paragraf pertama chapter awal mula. Kisah epik dimulai di sebuah desa terpencil yang damai.',
    },
    {
      chapterNumber: startChapterNumber + 1,
      title: `Chapter ${startChapterNumber + 1}: Perjalanan Menuju Hutan Hitam`,
      content: 'Mereka menembus lebatnya hutan kabut dengan pedang terhunus siap siaga.',
    },
    {
      chapterNumber: startChapterNumber + 2,
      title: `Chapter ${startChapterNumber + 2}: Pertarungan Sengit`,
      content: 'Kilatan petir menyambar di atas bukit batu ketika musuh bebuyutan akhirnya menampakkan diri.',
    },
  ];

  await test('4. Batch Add: Berhasil Menambahkan 3 Chapter Sekaligus', async () => {
    const res = await fetch(`${BASE_URL}/api/novels/${testNovelId}/chapters/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({ chapters: newChapters }),
    });

    const json = await res.json();
    assert(res.status === 201, `Expected 201 Created, got ${res.status}: ${json.message}`);
    assert(json.data.createdCount === 3, 'Expected createdCount to be 3');

    // Verifikasi di database
    const { prisma } = await import('../src/lib/prisma');
    const novelAfter = await prisma.novel.findUnique({
      where: { id: testNovelId },
      select: { totalChapters: true },
    });

    assert(
      novelAfter!.totalChapters === initialTotalChapters + 3,
      `Expected totalChapters to increment by 3, got ${novelAfter!.totalChapters}`
    );
  });

  // 5. Test Penolakan Duplikasi Terhadap Database (409 Conflict)
  await test('5. Konflik: Mengunggah nomor chapter yang sudah ada ditolak (409)', async () => {
    const duplicatePayload = [
      {
        chapterNumber: startChapterNumber, // Sudah ada dari test 4
        title: `Chapter ${startChapterNumber}: Duplikat`,
        content: 'Konten duplikat',
      },
    ];

    const res = await fetch(`${BASE_URL}/api/novels/${testNovelId}/chapters/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({ chapters: duplicatePayload }),
    });

    assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
  });

  // 6. Test Penolakan Duplikasi di Dalam Payload Sendiri (400 Bad Request)
  await test('6. Validasi: Nomor chapter kembar di dalam satu batch ditolak (400)', async () => {
    const intraDuplicatePayload = [
      {
        chapterNumber: startChapterNumber + 10,
        title: 'Bab A',
        content: 'Isi bab A',
      },
      {
        chapterNumber: startChapterNumber + 10, // Nomor sama
        title: 'Bab B',
        content: 'Isi bab B',
      },
    ];

    const res = await fetch(`${BASE_URL}/api/novels/${testNovelId}/chapters/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({ chapters: intraDuplicatePayload }),
    });

    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
  });

  // 7. Bersihkan chapter uji
  await test('7. Cleanup Chapter Uji', async () => {
    const { prisma } = await import('../src/lib/prisma');
    await prisma.chapter.deleteMany({
      where: {
        novelId: testNovelId,
        chapterNumber: { in: [startChapterNumber, startChapterNumber + 1, startChapterNumber + 2] },
      },
    });

    await prisma.novel.update({
      where: { id: testNovelId },
      data: { totalChapters: initialTotalChapters },
    });
  });

  console.log('\n🎉 SELURUH PENGUJIAN BATCH CHAPTERS BERHASIL LULUS 100%! 🎉\n');
}

main().catch((err) => {
  console.error('\nFatal test runner error:', err);
  process.exit(1);
});
