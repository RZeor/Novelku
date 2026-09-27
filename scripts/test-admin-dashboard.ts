/**
 * Verification test for Step 10 (Admin Layout & Dashboard Page)
 */

async function testAdminDashboard() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
  console.log(`🧪 Memeriksa Halaman Admin Dashboard di ${BASE_URL}...`);

  try {
    const res = await fetch(`${BASE_URL}/admin`);
    if (res.status === 200) {
      console.log('  ✓ Halaman /admin berhasil diakses (200 OK)');
    } else {
      console.error(`  ❌ Halaman /admin gagal: status ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /admin:', err.message);
  }

  console.log('🎉 Pengujian Admin Dashboard selesai!\n');
}

testAdminDashboard();
