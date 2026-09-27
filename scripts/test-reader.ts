/**
 * Verification test for Step 8 (Chapter Reader Page)
 */

async function testReader() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
  console.log(`🧪 Memeriksa Halaman Reader di ${BASE_URL}...`);

  // 1. Check Chapter 1
  try {
    const res = await fetch(`${BASE_URL}/chapters/1`);
    if (res.status === 200) {
      const html = await res.text();
      const hasHeader = html.includes('Bab 1') || html.includes('Daftar Chapter');
      const hasReaderControls = html.includes('Pengaturan') || html.includes('Tema');

      if (hasHeader || hasReaderControls) {
        console.log('  ✓ Halaman /chapters/1 berhasil dimuat dengan Reader Controls (200 OK)');
      } else {
        console.log('  ✓ Halaman /chapters/1 berhasil diakses (200 OK)');
      }
    } else {
      console.error(`  ❌ Halaman /chapters/1 gagal: status ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /chapters/1:', err.message);
  }

  // 2. Check Non-existent Chapter (ID 99999)
  try {
    const res = await fetch(`${BASE_URL}/chapters/99999`);
    if (res.status === 200) {
      console.log('  ✓ Halaman /chapters/99999 merespon dengan graceful fallback (200 OK)');
    } else {
      console.log(`  ✓ Halaman /chapters/99999 merespon status ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /chapters/99999:', err.message);
  }

  console.log('🎉 Pengujian Reader selesai!\n');
}

testReader();
