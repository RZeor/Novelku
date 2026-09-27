/**
 * Verification test for Step 11 (Admin Novels and Genres Pages)
 */

async function testAdminNovelsGenres() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
  console.log(`🧪 Memeriksa Halaman Admin Novels & Genres di ${BASE_URL}...`);

  // 1. Check /admin/novels
  try {
    const res = await fetch(`${BASE_URL}/admin/novels`);
    if (res.status === 200) {
      console.log('  ✓ Halaman /admin/novels berhasil diakses (200 OK)');
    } else {
      console.error(`  ❌ Halaman /admin/novels gagal: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /admin/novels:', err.message);
  }

  // 2. Check /admin/genres
  try {
    const res = await fetch(`${BASE_URL}/admin/genres`);
    if (res.status === 200) {
      console.log('  ✓ Halaman /admin/genres berhasil diakses (200 OK)');
    } else {
      console.error(`  ❌ Halaman /admin/genres gagal: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /admin/genres:', err.message);
  }

  console.log('🎉 Pengujian Admin Novels & Genres selesai!\n');
}

testAdminNovelsGenres();
