/**
 * Comprehensive API Test Script for Novelku
 * Tests all user & admin endpoints in sequence:
 * 1. Auth (Register, Login, Me, Logout)
 * 2. Genre (List, Admin Create)
 * 3. Novel (Admin Create, List, Filter, Search, Detail)
 * 4. Chapter (Admin Create, Read)
 * 5. Interactions (Like, Rating, Comment, Bookmark, History)
 * 6. Admin (Dashboard Stats, User Management, Comment Moderation)
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

let adminCookie = '';
let userCookie = '';
let createdNovelId = 0;
let createdChapterId = 0;
let createdCommentId = 0;

function parseCookie(res: Response): string {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return '';
  // Extract token cookie
  const match = setCookie.match(/novelku_token=([^;]+)/);
  return match ? `novelku_token=${match[1]}` : '';
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    process.stdout.write(`⏳ Testing: ${name}... `);
    await fn();
    console.log('✅ PASSED');
  } catch (err: any) {
    console.log('❌ FAILED');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`\n🚀 Memulai Pengujian API Novelku di ${BASE_URL}\n`);

  // ============================================================
  // 1. AUTHENTICATION
  // ============================================================
  await test('Admin Login (POST /api/auth/login)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@novelku.com',
        password: 'AdminPassword123!',
      }),
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}: ${json.message}`);
    assert(json.success === true, 'Response success should be true');
    assert(json.data.user.role === 'ADMIN', 'User role should be ADMIN');
    adminCookie = parseCookie(res);
    assert(adminCookie.length > 0, 'Auth cookie should be set');
  });

  await test('User Registration (POST /api/auth/register)', async () => {
    const testUsername = `user_${Date.now().toString().slice(-6)}`;
    const testEmail = `${testUsername}@example.com`;
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: 'UserPassword123!',
      }),
    });
    const json = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}: ${json.message}`);
    assert(json.success === true, 'Response success should be true');
    assert(json.data.user.role === 'USER', 'Registered user must have USER role');
    userCookie = parseCookie(res);
  });

  await test('Get Current User (GET /api/auth/me)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: userCookie },
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.user.role === 'USER', 'Role should be USER');
  });

  // ============================================================
  // 2. GENRES
  // ============================================================
  let sampleGenreId = 0;
  await test('Get Genres (GET /api/genres)', async () => {
    const res = await fetch(`${BASE_URL}/api/genres`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(json.data) && json.data.length > 0, 'Genres should not be empty');
    sampleGenreId = json.data[0].id;
  });

  await test('Admin Create Genre (POST /api/genres)', async () => {
    const genreName = `Isekai_${Date.now().toString().slice(-4)}`;
    const res = await fetch(`${BASE_URL}/api/genres`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({ name: genreName }),
    });
    const json = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}: ${json.message}`);
    assert(json.data.name === genreName, 'Genre name should match');
  });

  // ============================================================
  // 3. NOVELS
  // ============================================================
  await test('Admin Create Novel (POST /api/novels)', async () => {
    const res = await fetch(`${BASE_URL}/api/novels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        title: 'Petualangan di Dunia Sihir',
        description: 'Kisah seorang pemuda yang terbangun di dunia magis penuh misteri.',
        author: 'Penulis Hebat',
        status: 'ONGOING',
        genreIds: [sampleGenreId],
      }),
    });
    const json = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}: ${json.message}`);
    assert(json.data.title === 'Petualangan di Dunia Sihir', 'Title should match');
    createdNovelId = json.data.id;
  });

  await test('List Novels with Search & Filter (GET /api/novels)', async () => {
    const res = await fetch(`${BASE_URL}/api/novels?search=Sihir&status=ONGOING&page=1&limit=10`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.items.length > 0, 'Should find novel matching search');
    assert(json.data.pagination.total >= 1, 'Total count should be at least 1');
  });

  await test('Get Novel Detail (GET /api/novels/:id)', async () => {
    const res = await fetch(`${BASE_URL}/api/novels/${createdNovelId}`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.id === createdNovelId, 'Novel ID should match');
    assert(json.data.viewCount >= 1, 'View count should be incremented');
  });

  // ============================================================
  // 4. CHAPTERS
  // ============================================================
  await test('Admin Create Chapter (POST /api/novels/:id/chapters)', async () => {
    const chapterContent = `Matahari pagi bersinar terang di atas menara kastil kristal.
Rio membuka matanya perlahan. Suasana di sekelilingnya tampak asing.
Bukan kamarnya yang sempit di Jakarta, melainkan sebuah ruangan batu megah dengan jendela besar yang menghadap pegunungan salju.
"Di mana aku?" bisiknya pelan sembari mencoba bangkit.
Sebuah suara misterius menggema di kepalanya, memberikan sambutan di dunia baru.`;

    const res = await fetch(`${BASE_URL}/api/novels/${createdNovelId}/chapters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        chapterNumber: 1,
        title: 'Bab 1: Kebangkitan di Dunia Lain',
        content: chapterContent,
      }),
    });
    const json = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}: ${json.message}`);
    assert(json.data.wordCount > 0, 'Word count should be calculated automatically');
    createdChapterId = json.data.id;
  });

  await test('Read Chapter Content (GET /api/chapters/:id)', async () => {
    const res = await fetch(`${BASE_URL}/api/chapters/${createdChapterId}`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.content.includes('Rio membuka matanya'), 'Content should match');
  });

  // ============================================================
  // 5. USER INTERACTIONS
  // ============================================================
  await test('User Like Novel (POST /api/novels/:id/like)', async () => {
    const res = await fetch(`${BASE_URL}/api/novels/${createdNovelId}/like`, {
      method: 'POST',
      headers: { Cookie: userCookie },
    });
    const json = await res.json();
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    assert(json.data.liked === true, 'Liked should be true');
  });

  await test('User Rating Novel (POST /api/novels/:id/rating)', async () => {
    const res = await fetch(`${BASE_URL}/api/novels/${createdNovelId}/rating`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userCookie,
      },
      body: JSON.stringify({ value: 5 }),
    });
    const json = await res.json();
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    assert(json.data.value === 5, 'Rating value should be 5');
  });

  await test('User Comment on Novel (POST /api/novels/:id/comments)', async () => {
    const res = await fetch(`${BASE_URL}/api/novels/${createdNovelId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: userCookie,
      },
      body: JSON.stringify({ content: 'Ceritanya sangat seru! Ditunggu lanjutannya min.' }),
    });
    const json = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    createdCommentId = json.data.id;
  });

  await test('User Bookmark Novel (POST /api/novels/:id/bookmark)', async () => {
    const res = await fetch(`${BASE_URL}/api/novels/${createdNovelId}/bookmark`, {
      method: 'POST',
      headers: { Cookie: userCookie },
    });
    const json = await res.json();
    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    assert(json.data.bookmarked === true, 'Bookmarked should be true');
  });

  await test('User View Bookmarks (GET /api/bookmarks)', async () => {
    const res = await fetch(`${BASE_URL}/api/bookmarks`, {
      headers: { Cookie: userCookie },
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.items.length > 0, 'Bookmarks should contain bookmarked novel');
  });

  await test('Record Reading History (POST /api/chapters/:id/history)', async () => {
    const res = await fetch(`${BASE_URL}/api/chapters/${createdChapterId}/history`, {
      method: 'POST',
      headers: { Cookie: userCookie },
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.chapterId === createdChapterId, 'Chapter ID should match');
  });

  await test('View Reading History (GET /api/history)', async () => {
    const res = await fetch(`${BASE_URL}/api/history`, {
      headers: { Cookie: userCookie },
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.items.length > 0, 'History should contain read chapter');
  });

  // ============================================================
  // 6. ADMIN DASHBOARD & MANAGEMENT
  // ============================================================
  await test('Admin Dashboard Stats (GET /api/admin/dashboard)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Cookie: adminCookie },
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.totalUsers >= 2, 'Total users should be at least 2 (admin + user)');
    assert(json.data.totalNovels >= 1, 'Total novels should be at least 1');
    assert(json.data.totalChapters >= 1, 'Total chapters should be at least 1');
    assert(json.data.totalLikes >= 1, 'Total likes should be at least 1');
    assert(json.data.totalComments >= 1, 'Total comments should be at least 1');
    assert(json.data.totalRatings >= 1, 'Total ratings should be at least 1');
  });

  await test('Admin List Users (GET /api/admin/users)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Cookie: adminCookie },
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.items.length >= 2, 'Should list all registered users');
  });

  await test('Admin List & Moderate Comments (GET /api/admin/comments)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/comments`, {
      headers: { Cookie: adminCookie },
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.items.length >= 1, 'Should list comments for moderation');
  });

  // ============================================================
  // 7. PERMISSION SECURITY CHECK
  // ============================================================
  await test('Security: Regular user cannot access Admin Dashboard (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Cookie: userCookie },
    });
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('Security: Unauthenticated user cannot access protected routes (401 Unauthorized)', async () => {
    const res = await fetch(`${BASE_URL}/api/bookmarks`);
    assert(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  console.log('\n🎉 SEMUA PENGUJIAN BERHASIL (100% PASSED)!\n');
}

main();
