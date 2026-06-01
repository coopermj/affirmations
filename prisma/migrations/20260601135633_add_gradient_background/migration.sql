-- AlterEnum
ALTER TYPE "BackgroundMode" ADD VALUE 'GRADIENT';

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "backgroundGradient" TEXT;
