/**
 * Verification test for Google Drive Image Support & Chapter Illustrations
 */
import { formatImageUrl } from '../src/lib/utils';

async function testGoogleDriveImages() {
  console.log('🧪 Memeriksa Fitur Google Drive Image & Ilustrasi Bab...\n');

  // Test 1: formatImageUrl
  const testCases = [
    {
      input: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e14D/view?usp=sharing',
      expected: 'https://lh3.googleusercontent.com/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e14D',
      name: 'Google Drive Share Link (/file/d/ID/view)',
    },
    {
      input: 'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e14D',
      expected: 'https://lh3.googleusercontent.com/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e14D',
      name: 'Google Drive Open Link (?id=ID)',
    },
    {
      input: 'https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e14D',
      expected: 'https://lh3.googleusercontent.com/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e14D',
      name: 'Google Drive UC Link (?id=ID)',
    },
    {
      input: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
      expected: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
      name: 'Non-Google Drive URL (Unsplash)',
    },
  ];

  let passed = 0;
  for (const tc of testCases) {
    const result = formatImageUrl(tc.input);
    if (result === tc.expected) {
      console.log(`  ✓ [PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${tc.name}`);
      console.error(`     Diharapkan: ${tc.expected}`);
      console.error(`     Didapatkan: ${result}`);
    }
  }

  // Test 2: HTTP Page Render
  const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
  try {
    const res = await fetch(`${BASE_URL}/chapters/1`);
    if (res.status === 200) {
      console.log('  ✓ [PASS] Halaman Chapter Reader berhasil merender bab (200 OK)');
      passed++;
    } else {
      console.error(`  ❌ [FAIL] Chapter Reader status: ${res.status}`);
    }
  } catch (err: any) {
    console.error(`  ❌ [FAIL] Chapter Reader request error: ${err.message}`);
  }

  console.log(`\n🎉 Pengujian selesai! ${passed}/${testCases.length + 1} tes berhasil lolos.\n`);
}

testGoogleDriveImages();
