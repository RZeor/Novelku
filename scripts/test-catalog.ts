/**
 * Verification test for Step 6 (Novels Catalog & Search Page)
 */

async function testCatalog() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
  console.log(`🧪 Memeriksa Halaman Katalog & Pencarian di ${BASE_URL}...`);

  // 1. Check Default Catalog
  try {
    const res = await fetch(`${BASE_URL}/novels`);
    if (res.status === 200) {
      console.log('  ✓ Halaman /novels berhasil diakses (200 OK)');
    } else {
      console.error(`  ❌ Halaman /novels gagal: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /novels:', err.message);
  }

  // 2. Check Search & Filter Params
  try {
    const res = await fetch(`${BASE_URL}/novels?search=Sihir&status=ONGOING&page=1`);
    if (res.status === 200) {
      console.log('  ✓ Halaman /novels dengan query filter berhasil dimuat (200 OK)');
    } else {
      console.error(`  ❌ Halaman /novels dengan query gagal: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /novels dengan query:', err.message);
  }

  console.log('🎉 Pengujian Katalog & Pencarian selesai!\n');
}

testCatalog();
