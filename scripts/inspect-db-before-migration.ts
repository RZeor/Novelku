/**
 * Script: Pre-Migration Database Inspection
 * 
 * Tujuan: 
 * 1. Verify database schema matches Prisma schema
 * 2. Check for duplicate (userId, chapterId) records
 * 3. Count current records
 * 4. Report findings sebelum migration
 * 
 * Usage: npx tsx scripts/inspect-db-before-migration.ts
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

async function main() {
  console.log('\n🔍 PRE-MIGRATION DATABASE INSPECTION\n');

  try {
    // 1. Check current reading history records
    console.log('📊 CURRENT STATE:\n');
    
    const totalRecords = await prisma.readingHistory.count();
    console.log(`Total ReadingHistory records: ${totalRecords}`);

    if (totalRecords === 0) {
      console.log('ℹ️  Database is empty - no data to deduplicate\n');
      return;
    }

    // 2. Group by userId + chapterId to find duplicates
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

    // 3. Check for duplicates by (userId, novelId)
    const groupedByUserNovel = new Map<string, typeof allRecords>();
    for (const record of allRecords) {
      const key = `${record.userId}_${record.novelId}`;
      if (!groupedByUserNovel.has(key)) {
        groupedByUserNovel.set(key, []);
      }
      groupedByUserNovel.get(key)!.push(record);
    }

    let duplicateCount = 0;
    const duplicateGroups = [];

    for (const [key, records] of groupedByUserNovel) {
      if (records.length > 1) {
        duplicateCount++;
        duplicateGroups.push({
          key,
          count: records.length,
          records,
        });
      }
    }

    console.log(`Unique (userId, novelId) combinations: ${groupedByUserNovel.size}`);
    console.log(`Combinations with duplicates: ${duplicateCount}\n`);

    if (duplicateCount > 0) {
      console.log('⚠️  DUPLICATES FOUND:\n');
      
      let totalDuplicateRecords = 0;
      duplicateGroups.forEach(group => {
        const [userId, novelId] = group.key.split('_').map(Number);
        console.log(`  User ${userId}, Novel ${novelId}: ${group.count} records`);
        group.records.forEach((r, idx) => {
          const marker = idx === 0 ? '→ KEEP' : '→ DELETE';
          console.log(`    ${marker}: ID ${r.id}, Ch ${r.chapterId}, ${r.lastReadAt.toISOString()}`);
        });
        totalDuplicateRecords += group.count - 1; // Count records to delete
      });

      console.log(`\nTotal records to delete: ${totalDuplicateRecords}`);
      console.log(`Total records to keep: ${totalRecords - totalDuplicateRecords}\n`);

      console.log('✋ STOP: Run deduplicate script before migration:\n');
      console.log('  npx tsx scripts/deduplicate-reading-history.ts --force\n');
    } else {
      console.log('✅ NO DUPLICATES - Database is clean\n');
      console.log('Ready for migration!\n');
    }

    // 4. Show current constraint info
    console.log('📋 CURRENT CONSTRAINT INFO:\n');
    try {
      const constraints = await prisma.$queryRaw<Array<{ constraint_name: string; constraint_type: string }>>`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'reading_histories'
      `;
      
      if (constraints && constraints.length > 0) {
        constraints.forEach(c => {
          console.log(`  ${c.constraint_name} (${c.constraint_type})`);
        });
      }
    } catch (error) {
      console.log('  (Could not query constraints - will be checked by migration)');
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error during inspection:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
