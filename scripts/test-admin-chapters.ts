/**
 * Verification test for Step 12 (Admin Chapter Management & TXT Upload)
 */

async function testAdminChapters() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
  console.log(`🧪 Memeriksa Halaman & Fitur Admin Chapters di ${BASE_URL}...`);

  // 1. Check /admin/novels/1/chapters page route
  try {
    const res = await fetch(`${BASE_URL}/admin/novels/1/chapters`);
    if (res.status === 200) {
      console.log('  ✓ Halaman /admin/novels/1/chapters berhasil diakses (200 OK)');
    } else {
      console.error(`  ❌ Halaman /admin/novels/1/chapters gagal: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /admin/novels/1/chapters:', err.message);
  }

  // 2. Test Admin Login & Chapter API operations
  try {
    // Admin login
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
      console.error('  ❌ Gagal login admin untuk pengujian chapter');
      return;
    }
    console.log('  ✓ Admin login berhasil');

    const testChapterNumber = Math.floor(Date.now() / 1000) % 100000 + 1000;
    // Create a test chapter
    const createRes = await fetch(`${BASE_URL}/api/novels/1/chapters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookie,
      },
      body: JSON.stringify({
        chapterNumber: testChapterNumber,
        title: 'Bab Uji Coba Otomatis Step 12',
        content: 'Ini adalah konten pengujian untuk verifikasi Step 12 Admin Chapter Management.',
      }),
    });
    const createData = await createRes.json();
    if (createData.success && createData.data?.id) {
      console.log(`  ✓ Chapter baru berhasil dibuat (ID: ${createData.data.id}, Bab: ${createData.data.chapterNumber})`);
      const testChapterId = createData.data.id;

      // Update chapter
      const updateRes = await fetch(`${BASE_URL}/api/chapters/${testChapterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          cookie: cookie,
        },
        body: JSON.stringify({
          title: 'Bab Uji Coba Otomatis Step 12 (Diperbarui)',
        }),
      });
      const updateData = await updateRes.json();
      if (updateData.success) {
        console.log(`  ✓ Chapter berhasil diperbarui: "${updateData.data.title}"`);
      } else {
        console.error('  ❌ Gagal memperbarui chapter:', updateData);
      }

      // Delete chapter
      const deleteRes = await fetch(`${BASE_URL}/api/chapters/${testChapterId}`, {
        method: 'DELETE',
        headers: { cookie: cookie },
      });
      const deleteData = await deleteRes.json();
      if (deleteData.success) {
        console.log('  ✓ Chapter pengujian berhasil dihapus');
      } else {
        console.error('  ❌ Gagal menghapus chapter pengujian:', deleteData);
      }
    } else {
      console.error('  ❌ Gagal membuat chapter pengujian:', createData);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal menguji API chapter:', err.message);
  }

  console.log('🎉 Pengujian Admin Chapter Management selesai!\n');
}

testAdminChapters();
