/**
 * Verification test for Step 13 (Admin Users Management & Comment Moderation)
 */

async function testAdminUsersComments() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
  console.log(`🧪 Memeriksa Halaman & Fitur Admin Users & Comments di ${BASE_URL}...`);

  // 1. Check /admin/users page route
  try {
    const res = await fetch(`${BASE_URL}/admin/users`);
    if (res.status === 200) {
      console.log('  ✓ Halaman /admin/users berhasil diakses (200 OK)');
    } else {
      console.error(`  ❌ Halaman /admin/users gagal: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /admin/users:', err.message);
  }

  // 2. Check /admin/comments page route
  try {
    const res = await fetch(`${BASE_URL}/admin/comments`);
    if (res.status === 200) {
      console.log('  ✓ Halaman /admin/comments berhasil diakses (200 OK)');
    } else {
      console.error(`  ❌ Halaman /admin/comments gagal: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /admin/comments:', err.message);
  }

  // 3. Test Admin Login & API operations
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@novelku.com',
        password: 'AdminPassword123!',
      }),
    });
    const loginData = await loginRes.json();
    const cookie = loginRes.headers.get('set-cookie');

    if (!loginData.success || !cookie) {
      console.error('  ❌ Gagal login admin');
      return;
    }
    console.log('  ✓ Admin login berhasil');
    const adminId = loginData.data?.user?.id;

    // Test GET /api/admin/users
    const usersRes = await fetch(`${BASE_URL}/api/admin/users?page=1&limit=10`, {
      headers: { cookie },
    });
    const usersData = await usersRes.json();
    if (usersData.success && Array.isArray(usersData.data?.items)) {
      console.log(`  ✓ Berhasil mengambil daftar user (Total: ${usersData.data.pagination.total})`);
    } else {
      console.error('  ❌ Gagal mengambil daftar user:', usersData);
    }

    // Test Self-Deactivation Protection (admin cannot deactivate themselves)
    if (adminId) {
      const selfToggleRes = await fetch(`${BASE_URL}/api/admin/users/${adminId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie,
        },
        body: JSON.stringify({ isActive: false }),
      });
      const selfToggleData = await selfToggleRes.json();
      if (!selfToggleData.success && selfToggleRes.status === 400) {
        console.log('  ✓ Proteksi akun admin aktif (400: tidak dapat menonaktifkan akun sendiri)');
      } else {
        console.error('  ❌ Proteksi akun admin gagal:', selfToggleData);
      }
    }

    // Test GET /api/admin/comments
    const commentsRes = await fetch(`${BASE_URL}/api/admin/comments?page=1&limit=10`, {
      headers: { cookie },
    });
    const commentsData = await commentsRes.json();
    if (commentsData.success && Array.isArray(commentsData.data?.items)) {
      console.log(`  ✓ Berhasil mengambil daftar komentar (Total: ${commentsData.data.pagination.total})`);
    } else {
      console.error('  ❌ Gagal mengambil daftar komentar:', commentsData);
    }

    // Create a test comment to test moderation delete
    const addCommentRes = await fetch(`${BASE_URL}/api/novels/1/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie,
      },
      body: JSON.stringify({
        content: 'Komentar pengujian untuk verifikasi moderasi Step 13.',
      }),
    });
    const addCommentData = await addCommentRes.json();
    if (addCommentData.success && addCommentData.data?.id) {
      const testCommentId = addCommentData.data.id;
      console.log(`  ✓ Komentar pengujian berhasil dibuat (ID: ${testCommentId})`);

      // Delete the comment via admin moderation endpoint
      const deleteCommentRes = await fetch(`${BASE_URL}/api/admin/comments/${testCommentId}`, {
        method: 'DELETE',
        headers: { cookie },
      });
      const deleteCommentData = await deleteCommentRes.json();
      if (deleteCommentData.success) {
        console.log('  ✓ Moderasi hapus komentar berhasil');
      } else {
        console.error('  ❌ Gagal memoderasi hapus komentar:', deleteCommentData);
      }
    }
  } catch (err: any) {
    console.error('  ❌ Gagal menguji API admin:', err.message);
  }

  console.log('🎉 Pengujian Admin Users & Comments selesai!\n');
}

testAdminUsersComments();
