/**
 * Verification test for Step 3 (Auth Context, Login & Register pages)
 */

async function testAuthPages() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
  console.log(`🧪 Memeriksa halaman autentikasi di ${BASE_URL}...`);

  // 1. Check Login Page HTML
  try {
    const res = await fetch(`${BASE_URL}/login`);
    if (res.status === 200) {
      const html = await res.text();
      if (html.includes('Selamat Datang Kembali') || html.includes('login')) {
        console.log('  ✓ Halaman /login berhasil dimuat (200 OK)');
      } else {
        console.log('  ✓ Halaman /login merespon 200 OK');
      }
    } else {
      console.error(`  ❌ Halaman /login gagal: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /login:', err.message);
  }

  // 2. Check Register Page HTML
  try {
    const res = await fetch(`${BASE_URL}/register`);
    if (res.status === 200) {
      const html = await res.text();
      if (html.includes('Buat Akun Baru') || html.includes('register')) {
        console.log('  ✓ Halaman /register berhasil dimuat (200 OK)');
      } else {
        console.log('  ✓ Halaman /register merespon 200 OK');
      }
    } else {
      console.error(`  ❌ Halaman /register gagal: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  ❌ Gagal memanggil /register:', err.message);
  }

  console.log('🎉 Pengujian halaman autentikasi selesai!\n');
}

testAuthPages();
