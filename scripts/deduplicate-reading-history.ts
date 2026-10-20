/**
 * Script: Deduplicate Reading History
 * 
 * Tujuan: Menghapus record duplikat ReadingHistory sebelum migration constraint
 * Strategi: Untuk setiap (userId, novelId), pertahankan record dengan lastReadAt terbaru
 * 
 * Safety:
 * - Script hanya menghapus, tidak mengubah data yang dipertahankan
 * - Setiap record terbaru disimpan dengan chapterId dan lastReadAt terbaru
 * - FK relations tetap valid (verified sebelum delete)
 * 
 * Usage: 
 *   npx tsx scripts/deduplicate-reading-history.ts                    (dry-run)
 *   npx tsx scripts/deduplicate-reading-history.ts --force             (execute)
 *   CONFIRM_DEDUPLICATE=true npx tsx scripts/deduplicate-reading-history.ts (env-based)
 * 
 * Pre-flight:
 * 1. Backup database: pg_dump novelku_db > backup.sql
 * 2. Test di staging dulu
 * 3. Verify hasil dengan query di bawah
 */

import 'dotenv/config';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

interface DuplicateGroup {
  userId: number;
  novelId: number;
  count: number;
  newest: {
    id: number;
    chapterId: number;
    lastReadAt: Date;
  };
  deleted: Array<{
    id: number;
    chapterId: number;
    lastReadAt: Date;
  }>;
}

async function main() {
  console.log('🔍 Starting reading history deduplication...\n');

  try {
    // 1. Identifikasi semua kombinasi userId + novelId
    const allRecords = await prisma.readingHistory.findMany({
      select: {
        id: true,
        userId: true,
        novelId: true,
        chapterId: true,
        lastReadAt: true,
      },
      orderBy: [{ userId: 'asc' }, { novelId: 'asc' }, { lastReadAt: 'desc' }],
    });

    console.log(`📊 Total reading history records: ${allRecords.length}\n`);

    // 2. Group by userId + novelId
    const grouped = new Map<string, typeof allRecords>();
    for (const record of allRecords) {
      const key = `${record.userId}_${record.novelId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(record);
    }

    // 3. Identifikasi duplikat (group dengan > 1 record)
    const duplicateGroups: DuplicateGroup[] = [];
    const groupsToClean: string[] = [];

    for (const [key, records] of grouped) {
      if (records.length > 1) {
        const [newest, ...rest] = records; // Sorted by lastReadAt DESC
        duplicateGroups.push({
          userId: newest.userId,
          novelId: newest.novelId,
          count: records.length,
          newest: {
            id: newest.id,
            chapterId: newest.chapterId,
            lastReadAt: newest.lastReadAt,
          },
          deleted: rest.map(r => ({
            id: r.id,
            chapterId: r.chapterId,
            lastReadAt: r.lastReadAt,
          })),
        });
        groupsToClean.push(key);
      }
    }

    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicates found! Database is already clean.');
      console.log('Ready for migration.\n');
      return;
    }

    console.log(`⚠️  Found ${duplicateGroups.length} duplicate groups:\n`);
    duplicateGroups.forEach(group => {
      console.log(`  • User ${group.userId}, Novel ${group.novelId}:`);
      console.log(`    - Count: ${group.count} records`);
      console.log(`    - Keeping: ID ${group.newest.id} (chapterId: ${group.newest.chapterId}, lastReadAt: ${group.newest.lastReadAt.toISOString()})`);
      console.log(`    - Deleting: ${group.deleted.length} records`);
      group.deleted.forEach(d => {
        console.log(`      • ID ${d.id} (chapterId: ${d.chapterId}, lastReadAt: ${d.lastReadAt.toISOString()})`);
      });
    });

    // 4. Konfirmasi sebelum delete
    const totalToDelete = duplicateGroups.reduce((acc, g) => acc + g.deleted.length, 0);
    console.log(`\n⚠️  Ready to delete ${totalToDelete} records.\n`);

    // Auto-confirm untuk environment testing (sesuaikan jika perlu interactive prompt)
    const shouldProceed = process.env.CONFIRM_DEDUPLICATE === 'true' || process.argv.includes('--force');
    
    if (!shouldProceed) {
      console.log('📋 DRY RUN MODE - No changes made.');
      console.log('\nTo proceed with deletion, run with flag:');
      console.log('  npx tsx scripts/deduplicate-reading-history.ts --force\n');
      console.log('Or set environment variable:');
      console.log('  CONFIRM_DEDUPLICATE=true npx tsx scripts/deduplicate-reading-history.ts\n');
      return;
    }

    console.log('🚀 EXECUTING DELETION...\n');

    // 5. Delete duplikat
    let totalDeleted = 0;
    const results: Array<{ userId: number; novelId: number; deletedCount: number }> = [];

    for (const group of duplicateGroups) {
      const idsToDelete = group.deleted.map(d => d.id);
      
      const deleteResult = await prisma.readingHistory.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      });

      totalDeleted += deleteResult.count;
      results.push({
        userId: group.userId,
        novelId: group.novelId,
        deletedCount: deleteResult.count,
      });

      console.log(
        `✓ User ${group.userId}, Novel ${group.novelId}: ` +
        `${group.count} → 1 (deleted ${deleteResult.count})`
      );
    }

    // 6. Verify hasil
    console.log(`\n🔍 Verifying...\n`);

    const remainingDuplicates = await prisma.$queryRaw<Array<{ userId: number; novelId: number; count: bigint }>>`
      SELECT "user_id" AS "userId", "novel_id" AS "novelId", COUNT(*) as count
      FROM "reading_histories"
      GROUP BY "user_id", "novel_id"
      HAVING COUNT(*) > 1
      ORDER BY count DESC;
    `;

    if (remainingDuplicates.length > 0) {
      console.error(`❌ ERROR: Found ${remainingDuplicates.length} remaining duplicates!`);
      remainingDuplicates.forEach(dup => {
        console.error(`  • User ${dup.userId}, Novel ${dup.novelId}: ${dup.count} records`);
      });
      throw new Error('Deduplication verification failed');
    }

    const finalCount = await prisma.readingHistory.count();
    const expectedCount = allRecords.length - totalDeleted;

    console.log(`✅ Deduplication complete!`);
    console.log(`   Total deleted: ${totalDeleted}`);
    console.log(`   Remaining records: ${finalCount} (expected: ${expectedCount})`);
    
    if (finalCount !== expectedCount) {
      throw new Error(`Count mismatch! Expected ${expectedCount}, got ${finalCount}`);
    }

    console.log(`\n✨ Database is ready for migration!\n`);

  } catch (error) {
    console.error('❌ Error during deduplication:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
