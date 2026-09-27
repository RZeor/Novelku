import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Memulai seeding database...');

  // 1. Seed Genres
  const defaultGenres = [
    { name: 'Fantasy', slug: 'fantasy' },
    { name: 'Action', slug: 'action' },
    { name: 'Romance', slug: 'romance' },
    { name: 'Sci-Fi', slug: 'sci-fi' },
    { name: 'Mystery', slug: 'mystery' },
    { name: 'Slice of Life', slug: 'slice-of-life' },
    { name: 'Horror', slug: 'horror' },
    { name: 'Comedy', slug: 'comedy' },
  ];

  for (const genre of defaultGenres) {
    const existing = await prisma.genre.findUnique({ where: { slug: genre.slug } });
    if (!existing) {
      await prisma.genre.create({ data: genre });
      console.log(`  ✓ Genre dibuat: ${genre.name}`);
    } else {
      console.log(`  - Genre sudah ada: ${genre.name}`);
    }
  }

  // 2. Seed Admin User
  const adminEmail = 'admin@novelku.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('AdminPassword123!', 12);
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`  ✓ Admin user dibuat: ${admin.username} (${admin.email})`);
    console.log(`    Password: AdminPassword123!`);
  } else {
    console.log(`  - Admin user sudah ada: ${existingAdmin.email}`);
  }

  console.log('🎉 Seeding selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
