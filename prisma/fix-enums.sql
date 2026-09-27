-- Create enum types expected by Prisma
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "NovelStatus" AS ENUM ('ONGOING', 'COMPLETED', 'HIATUS');

-- Alter users.role to use the enum type
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE users ALTER COLUMN role TYPE "Role" USING role::"Role";
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER'::"Role";

-- Alter novels.status to use the enum type
ALTER TABLE novels ALTER COLUMN status DROP DEFAULT;
ALTER TABLE novels ALTER COLUMN status TYPE "NovelStatus" USING status::"NovelStatus";
ALTER TABLE novels ALTER COLUMN status SET DEFAULT 'ONGOING'::"NovelStatus";
