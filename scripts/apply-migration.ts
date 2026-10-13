import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🔄 Menghubungkan ke Neon PostgreSQL database...');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL tidak ditemukan di .env');
  }

  const pool = new Pool({ connectionString });

  try {
    const migrationPath = path.join(
      process.cwd(),
      'prisma',
      'migrations',
      '20261013000000_add_reading_sessions',
      'migration.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Menerapkan migrasi reading_sessions...');
    await pool.query(sql);
    console.log('✅ Migrasi SQL berhasil diterapkan!');

    // Verifikasi tabel
    const verifyRes = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name = 'reading_sessions'`
    );

    if (verifyRes.rows.length > 0) {
      console.log('🎉 Tabel "reading_sessions" terverifikasi ada di Neon DB.');
    } else {
      console.error('❌ Tabel "reading_sessions" tidak ditemukan setelah migrasi.');
    }

    // Tampilkan detail kolom
    const colsRes = await pool.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'reading_sessions' ORDER BY ordinal_position`
    );
    console.log('\nKolom tabel reading_sessions:');
    colsRes.rows.forEach((c) => {
      console.log(` - ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`);
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Terjadi kesalahan saat migrasi:', msg);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
