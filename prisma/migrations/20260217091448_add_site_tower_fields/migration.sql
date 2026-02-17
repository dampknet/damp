/*
  Warnings:

  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."TowerType" AS ENUM ('GBC', 'KNET');

-- AlterTable
ALTER TABLE "public"."Site" ADD COLUMN     "gps" TEXT,
ADD COLUMN     "towerHeight" INTEGER,
ADD COLUMN     "towerType" "public"."TowerType" NOT NULL DEFAULT 'GBC';

-- DropTable
DROP TABLE "public"."AuditLog";

-- DropEnum
DROP TYPE "public"."AuditAction";
