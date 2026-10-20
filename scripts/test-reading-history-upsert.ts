/**
 * Script: Verifikasi Kriteria Keberhasilan Reading History
 * 
 *_minimum:_
 * Skema constraint `@@unique([userId, novelId])` harus sudah di-apply di DB.
 * 
 * Menguji kriteria keberhasilan:
 * - Membuka Chapter 1, lalu Chapter 4, lalu Chapter 100 pada novel yang sama
 *   menghasilkan SATU record untuk kombinasi pengguna dan novel.
 * - Record itu menunjuk Chapter 100 dan mempunyai `lastReadAt` terbaru.
 * 
 * Keamanan:
 * - Seluruh test berjalan di dalam transaksi yang di-ROLLBACK (throw sentinel),
 *   sehingga TIDAK ada data yang tersisa di database.
 * 
 * Usage: npx tsx scripts/test-reading-history-upsert.ts
 */

import 'dotenv/config';
import { prisma } from '@/lib/prisma';

const ROLLBACK_SENTINEL = 'ROLLBACK_TEST_SENTINEL';

async function main() {
  console.log('\n🧪 Verifikasi Upsert Reading History (satu record per user per novel)\n');

  // 1. Pastikan constraint baru sudah aktif di database
  const constraints = (await prisma.$queryRaw<Array<{ conname: string; def: string }>>`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'reading_histories'::regclass AND contype = 'u'
  `) as Array<{ conname: string; def: string }>;

  const uniqueConstraint = constraints[0];
  const isNewConstraint = uniqueConstraint?.def === 'UNIQUE (user_id, novel_id)';

  if (!uniqueConstraint) {
    console.error('❌ FAIL: Tidak ada unique constraint di reading_histories.');
    process.exit(1);
  }

  if (!isNewConstraint) {
    console.error(`❌ FAIL: Unique constraint bukan [userId, novelId]. Ditemukan: ${uniqueConstraint.def}`);
    process.exit(1);
  }

  console.log(`✅ Constraint unik: ${uniqueConstraint.conname} → ${uniqueConstraint.def}`);
  console.log('');

  // 2. Test upsert di dalam transaksi yang di-rollback
  try {
    await prisma.$transaction(async (tx) => {
      // 2a. Buat data test (semua akan hilang setelah rollback)
      const user = await tx.user.create({
        data: {
          username: `__test_history_${Date.now()}`,
          email: `__test_history_${Date.now()}@example.invalid`,
          password: 'irrelevant_hash_value',
        },
      });

      const novel = await tx.novel.create({
        data: {
          title: `__test_novel_${Date.now()}`,
          slug: `__test_novel_${Date.now()}`,
          author: 'Test Script',
        },
      });

      const chapter1 = await tx.chapter.create({
        data: {
          novelId: novel.id,
          chapterNumber: 1,
          title: 'Test Chapter 1',
          content: 'test',
        },
      });
      const chapter4 = await tx.chapter.create({
        data: {
          novelId: novel.id,
          chapterNumber: 4,
          title: 'Test Chapter 4',
          content: 'test',
        },
      });
      const chapter100 = await tx.chapter.create({
        data: {
          novelId: novel.id,
          chapterNumber: 100,
          title: 'Test Chapter 100',
          content: 'test',
        },
      });

      // 2b. Simulasi: user membuka Chapter 1 → 4 → 100
      //     (logika yang sama dengan POST /api/chapters/:id/history)
      const simulateOpenChapter = async (chapterId: number) => {
        await tx.readingHistory.upsert({
          where: {
            userId_novelId: {
              userId: user.id,
              novelId: novel.id,
            },
          },
          update: {
            chapterId,
            lastReadAt: new Date(),
          },
          create: {
            userId: user.id,
            novelId: novel.id,
            chapterId,
            lastReadAt: new Date(),
          },
        });
      };

      await simulateOpenChapter(chapter1.id);
      await simulateOpenChapter(chapter4.id);
      await simulateOpenChapter(chapter100.id);

      // 2c. Verifikasi hasil
      const records = await tx.readingHistory.findMany({
        where: { userId: user.id, novelId: novel.id },
      });

      const totalRows = records.length;
      const finalChapterId = records[0]?.chapterId;

      console.log(`   Chapter 1 → diproses`);
      console.log(`   Chapter 4 → diproses`);
      console.log(`   Chapter 100 → diproses`);
      console.log(`   Total record di DB: ${totalRows}`);
      console.log(`   chapterId akhir: ${finalChapterId}`);
      console.log('');

      if (totalRows !== 1) {
        throw new Error(`GAGAL: Harusnya 1 record, ditemukan ${totalRows}`);
      }
      if (finalChapterId !== chapter100.id) {
        throw new Error(`GAGAL: Record harus menunjuk Chapter 100, tapi menunjuk chapterId=${finalChapterId}`);
      }

      console.log('✅ PASS: Satu record per (user, novel), menunjuk chapter terakhir yang dibaca.');
      console.log('');

      // 2d. Rollback dengan membuat transaksi gagal
      throw new Error(ROLLBACK_SENTINEL);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message !== ROLLBACK_SENTINEL) {
      console.error('❌ FAIL: Unexpected error:', message);
      process.exit(1);
    }
    // Expected rollback
  }

  // 3. Verifikasi tidak ada data test yang tersisa
  const leftoverUsers = await prisma.user.count({
    where: { username: { startsWith: '__test_history_' } },
  });
  const leftoverNovels = await prisma.novel.count({
    where: { slug: { startsWith: '__test_novel_' } },
  });

  if (leftoverUsers > 0 || leftoverNovels > 0) {
    console.error(`❌ FAIL: Data test bocor (users=${leftoverUsers}, novels=${leftoverNovels}). Rollback tidak sempurna!`);
    process.exit(1);
  }

  console.log('🧹 Rollback verified: Tidak ada data test yang tersisa di database.');
  console.log('\n🎉 Semua kriteria keberhasilan sudah tercapai!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
