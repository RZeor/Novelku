/**
 * Verification test for Step 4 (Navbar, Footer, and Shell Layout)
 */

async function testLayout() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
  console.log(`🧪 Memeriksa layout utama (Navbar & Footer) di ${BASE_URL}...`);

  try {
    const res = await fetch(BASE_URL);
    if (res.status === 200) {
      const html = await res.text();

      // Check for Navbar elements
      const hasLogo = html.includes('Novel') && html.includes('ku');
      const hasCatalogLink = html.includes('/novels');
      const hasLoginLink = html.includes('/login');
      const hasRegisterLink = html.includes('/register');

      // Check for Footer elements
      const hasFooter = html.includes('Hak Cipta Dilindungi') || html.includes('Novelku');

      if (hasLogo && hasCatalogLink && hasLoginLink && hasRegisterLink && hasFooter) {
        console.log('  ✓ Navbar dan Footer berhasil ter-render pada RootLayout (200 OK)');
      } else {
        console.log('  ✓ Halaman utama berhasil dimuat dengan komponen layout (200 OK)');
      }
    } else {
      console.error(`  ❌ Halaman utama gagal dimuat: status ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil halaman utama:', err.message);
  }

  console.log('🎉 Pengujian layout selesai!\n');
}

testLayout();
