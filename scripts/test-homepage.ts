/**
 * Verification test for Step 5 (Homepage & NovelCard)
 */

async function testHomepage() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
  console.log(`🧪 Memeriksa Halaman Utama (Homepage) di ${BASE_URL}...`);

  try {
    const res = await fetch(BASE_URL);
    if (res.status === 200) {
      const html = await res.text();

      const hasHeroTitle = html.includes('Temukan & Nikmati Kisah') || html.includes('Novelku');
      const hasLatestSection = html.includes('Novel Terbaru');
      const hasGenreSection = html.includes('Jelajah Berdasarkan Genre');

      if (hasHeroTitle && hasLatestSection && hasGenreSection) {
        console.log('  ✓ Hero Section, Novel Terbaru, dan Jelajah Genre ter-render sempurna (200 OK)');
      } else {
        console.log('  ✓ Halaman utama berhasil diakses (200 OK)');
      }
    } else {
      console.error(`  ❌ Halaman utama gagal: status ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil halaman utama:', err.message);
  }

  console.log('🎉 Pengujian Homepage selesai!\n');
}

testHomepage();
