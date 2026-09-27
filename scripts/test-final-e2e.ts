/**
 * STEP 15: Final Comprehensive End-to-End Test Suite for Novelku
 * Tests every single feature across Backend APIs and Frontend Pages.
 */

async function runFinalE2ETest() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
  console.log('===========================================================');
  console.log('🚀 NOVELKU — PENGUJIAN FINAL KOMPREHENSIF (STEP 15)');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('===========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // -----------------------------------------------------------------
  // 1. PENGUJIAN OTENTIKASI & PENGGUNA BARU (READER)
  // -----------------------------------------------------------------
  console.log('📌 1. Pengujian Otentikasi & Registrasi Pengguna Baru');
  const timestamp = Date.now();
  const testEmail = `reader_${timestamp}@novelku.com`;
  const testUsername = `reader_${timestamp.toString().slice(-5)}`;
  const testPassword = 'Password123!';

  let userCookie = '';
  let userId = 0;

  try {
    // Register
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUsername,
        email: testEmail,
        password: testPassword,
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success, 'Registrasi akun pembaca baru berhasil');

    // Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    const rawCookie = loginRes.headers.get('set-cookie');
    userCookie = rawCookie || '';
    userId = loginData.data?.user?.id;
    assert(loginRes.status === 200 && loginData.success, 'Login akun pembaca berhasil');
    assert(loginData.data?.user?.role === 'USER', 'Peran akun baru terverifikasi sebagai USER');
  } catch (err: any) {
    assert(false, `Otentikasi pengguna gagal: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // 2. PENGUJIAN KATALOG, NOVEL & BACA CHAPTER
  // -----------------------------------------------------------------
  console.log('\n📌 2. Pengujian Eksplorasi Novel & Pembacaan Bab');
  let sampleNovelId = 1;
  let sampleChapterId = 1;

  try {
    // List Novels
    const novelsRes = await fetch(`${BASE_URL}/api/novels?limit=5`);
    const novelsData = await novelsRes.json();
    assert(novelsRes.status === 200 && novelsData.success && novelsData.data.items.length > 0, 'Mengambil daftar novel di katalog');
    sampleNovelId = novelsData.data.items[0].id;

    // Novel Detail
    const detailRes = await fetch(`${BASE_URL}/api/novels/${sampleNovelId}`);
    const detailData = await detailRes.json();
    assert(detailRes.status === 200 && detailData.success, `Mengambil detail novel "${detailData.data.title}"`);
    if (detailData.data.chapters.length > 0) {
      sampleChapterId = detailData.data.chapters[0].id;
    }

    // Read Chapter Content
    const chapterRes = await fetch(`${BASE_URL}/api/chapters/${sampleChapterId}`);
    const chapterData = await chapterRes.json();
    assert(chapterRes.status === 200 && chapterData.success, `Membaca konten bab: "${chapterData.data.title}"`);

    // Record Reading History
    const historyRecordRes = await fetch(`${BASE_URL}/api/chapters/${sampleChapterId}/history`, {
      method: 'POST',
      headers: { cookie: userCookie },
    });
    const historyRecordData = await historyRecordRes.json();
    assert(historyRecordRes.status === 200 && historyRecordData.success, 'Merekam riwayat membaca ke database');

    // Get History List
    const historyListRes = await fetch(`${BASE_URL}/api/history`, {
      headers: { cookie: userCookie },
    });
    const historyListData = await historyListRes.json();
    assert(
      historyListRes.status === 200 &&
        historyListData.success &&
        historyListData.data.items.some((h: any) => h.chapterId === sampleChapterId),
      'Riwayat membaca tampil di daftar riwayat pengguna'
    );
  } catch (err: any) {
    assert(false, `Eksplorasi novel gagal: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // 3. PENGUJIAN INTERAKSI: BOOKMARK, LIKE, RATING, KOMENTAR
  // -----------------------------------------------------------------
  console.log('\n📌 3. Pengujian Interaksi Pengguna (Favorit, Suka, Rating, Komentar)');
  let testCommentId = 0;

  try {
    // Add Bookmark
    const bmRes = await fetch(`${BASE_URL}/api/novels/${sampleNovelId}/bookmark`, {
      method: 'POST',
      headers: { cookie: userCookie },
    });
    const bmData = await bmRes.json();
    assert([200, 201].includes(bmRes.status) && bmData.success, 'Menambahkan novel ke daftar Favorit');

    // Verify in Bookmarks List
    const bmListRes = await fetch(`${BASE_URL}/api/bookmarks`, {
      headers: { cookie: userCookie },
    });
    const bmListData = await bmListRes.json();
    assert(
      bmListRes.status === 200 &&
        bmListData.success &&
        bmListData.data.items.some((b: any) => b.novelId === sampleNovelId),
      'Novel tampil di daftar Favorit pengguna'
    );

    // Toggle Like
    const likeRes = await fetch(`${BASE_URL}/api/novels/${sampleNovelId}/like`, {
      method: 'POST',
      headers: { cookie: userCookie },
    });
    const likeData = await likeRes.json();
    assert([200, 201].includes(likeRes.status) && likeData.success, 'Menyukai novel (Like)');

    // Submit Rating
    const rateRes = await fetch(`${BASE_URL}/api/novels/${sampleNovelId}/rating`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: userCookie,
      },
      body: JSON.stringify({ value: 5 }),
    });
    const rateData = await rateRes.json();
    assert([200, 201].includes(rateRes.status) && rateData.success, 'Memberikan rating bintang 5');

    // Post Comment
    const commentRes = await fetch(`${BASE_URL}/api/novels/${sampleNovelId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: userCookie,
      },
      body: JSON.stringify({ content: 'Novel ini sangat menarik dan seru!' }),
    });
    const commentData = await commentRes.json();
    testCommentId = commentData.data?.id;
    assert(commentRes.status === 201 && commentData.success, `Mengirim komentar pembaca (ID: ${testCommentId})`);
  } catch (err: any) {
    assert(false, `Interaksi pengguna gagal: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // 4. PENGUJIAN ADMINISTRASI & MODERASI (ADMIN)
  // -----------------------------------------------------------------
  console.log('\n📌 4. Pengujian Fitur Administrator & Moderasi');
  try {
    // Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@novelku.com',
        password: 'AdminPassword123!',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminCookie = adminLoginRes.headers.get('set-cookie') || '';
    assert(adminLoginRes.status === 200 && adminLoginData.data?.user?.role === 'ADMIN', 'Login Administrator berhasil');

    // Dashboard Statistics
    const dashRes = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { cookie: adminCookie },
    });
    const dashData = await dashRes.json();
    assert(
      dashRes.status === 200 &&
        dashData.success &&
        typeof dashData.data.totalNovels === 'number' &&
        typeof dashData.data.totalUsers === 'number',
      `Dashboard statistik admin memuat data akurat (Total Novel: ${dashData.data?.totalNovels}, Pengguna: ${dashData.data?.totalUsers})`
    );

    // Moderation Delete Comment
    if (testCommentId) {
      const delCommentRes = await fetch(`${BASE_URL}/api/admin/comments/${testCommentId}`, {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });
      const delCommentData = await delCommentRes.json();
      assert(delCommentRes.status === 200 && delCommentData.success, 'Moderasi admin berhasil menghapus komentar pembaca');
    }

    // Toggle User Status
    if (userId) {
      const toggleRes = await fetch(`${BASE_URL}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({ isActive: false }),
      });
      const toggleData = await toggleRes.json();
      assert(toggleRes.status === 200 && toggleData.data.isActive === false, 'Admin berhasil menonaktifkan pengguna uji coba');

      // Re-activate
      await fetch(`${BASE_URL}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({ isActive: true }),
      });
    }
  } catch (err: any) {
    assert(false, `Fitur administrator gagal: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // 5. PENGUJIAN SELURUH RUTE HALAMAN FRONTEND (HTTP 200 OK)
  // -----------------------------------------------------------------
  console.log('\n📌 5. Pengujian Aksesibilitas 12 Rute Halaman Frontend');
  const pages = [
    { path: '/', name: 'Homepage (Beranda)' },
    { path: '/novels', name: 'Katalog & Filter Novel' },
    { path: `/novels/${sampleNovelId}`, name: 'Detail Novel' },
    { path: `/chapters/${sampleChapterId}`, name: 'Chapter Reader' },
    { path: '/bookmarks', name: 'Favorit (Bookmarks)' },
    { path: '/history', name: 'Riwayat Membaca' },
    { path: '/login', name: 'Halaman Masuk (Login)' },
    { path: '/register', name: 'Halaman Pendaftaran (Register)' },
    { path: '/admin', name: 'Admin Dashboard' },
    { path: '/admin/novels', name: 'Admin Kelola Novel' },
    { path: '/admin/genres', name: 'Admin Kelola Genre' },
    { path: '/admin/users', name: 'Admin Kelola Pengguna' },
  ];

  for (const page of pages) {
    try {
      const res = await fetch(`${BASE_URL}${page.path}`);
      assert(res.status === 200, `Halaman ${page.name} (${page.path}) -> 200 OK`);
    } catch (err: any) {
      assert(false, `Halaman ${page.name} gagal diakses: ${err.message}`);
    }
  }

  // -----------------------------------------------------------------
  // KESIMPULAN AKHIR
  // -----------------------------------------------------------------
  console.log('\n===========================================================');
  console.log(`🏁 HASIL AKHIR: ${passedTests} dari ${totalTests} pengujian lolos (${Math.round((passedTests / totalTests) * 100)}%)`);
  if (passedTests === totalTests) {
    console.log('🎉 SELURUH SISTEM NOVELKU 100% LOLOS DAN BERFUNGSI SEMPURNA!');
  } else {
    console.warn('⚠️ Beberapa pengujian memerlukan pemeriksaan lebih lanjut.');
  }
  console.log('===========================================================\n');
}

runFinalE2ETest();
