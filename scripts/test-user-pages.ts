/**
 * Verification test for Step 9 (Bookmarks and History Pages)
 */

async function testUserPages() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
  console.log(`🧪 Memeriksa Halaman Bookmark & Riwayat di ${BASE_URL}...`);

  // 1. Check /bookmarks
  try {
    const res = await fetch(`${BASE_URL}/bookmarks`);
    if (res.status === 200) {
      console.log('  ✓ Halaman /bookmarks berhasil diakses (200 OK)');
    } else {
      console.error(`  ❌ Halaman /bookmarks gagal: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /bookmarks:', err.message);
  }

  // 2. Check /history
  try {
    const res = await fetch(`${BASE_URL}/history`);
    if (res.status === 200) {
      console.log('  ✓ Halaman /history berhasil diakses (200 OK)');
    } else {
      console.error(`  ❌ Halaman /history gagal: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /history:', err.message);
  }

  console.log('🎉 Pengujian Halaman User selesai!\n');
}

testUserPages();
