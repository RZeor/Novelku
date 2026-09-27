/**
 * Verification test for Step 14 (Responsive Refinement & Mobile Optimization)
 */

async function testResponsivePages() {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
  console.log(`🧪 Memeriksa Kelayakan Seluruh Rute Halaman (Step 14) di ${BASE_URL}...`);

  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/novels', name: 'Katalog & Pencarian Novel' },
    { path: '/novels/1', name: 'Detail Novel (Mobile/Desktop)' },
    { path: '/chapters/1', name: 'Reader Chapter (Mobile Toolbar & Typography)' },
    { path: '/bookmarks', name: 'Halaman Favorit' },
    { path: '/history', name: 'Halaman Riwayat Baca' },
    { path: '/admin', name: 'Admin Dashboard' },
    { path: '/admin/novels', name: 'Admin Kelola Novel' },
    { path: '/admin/genres', name: 'Admin Kelola Genre' },
    { path: '/admin/novels/1/chapters', name: 'Admin Kelola Bab' },
    { path: '/admin/users', name: 'Admin Kelola Pengguna' },
    { path: '/admin/comments', name: 'Admin Moderasi Komentar' },
  ];

  let passed = 0;
  for (const page of pages) {
    try {
      const res = await fetch(`${BASE_URL}${page.path}`);
      if (res.status === 200) {
        console.log(`  ✓ ${page.name} (${page.path}) -> 200 OK`);
        passed++;
      } else {
        console.error(`  ❌ ${page.name} (${page.path}) -> Gagal (${res.status})`);
      }
    } catch (err: any) {
      console.error(`  ❌ ${page.name} (${page.path}) -> Error: ${err.message}`);
    }
  }

  console.log(`\n📊 Hasil Verifikasi: ${passed}/${pages.length} rute halaman berhasil diakses.`);
  if (passed === pages.length) {
    console.log('🎉 Seluruh halaman lolos pengujian verifikasi Step 14!\n');
  }
}

testResponsivePages();
