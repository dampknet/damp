/*
  Warnings:

  - You are about to drop the column `after` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `before` on the `AuditLog` table. All the data in the column will be lost.
  - Changed the type of `action` on the `AuditLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE');

-- DropIndex
DROP INDEX "public"."AuditLog_entityId_idx";

-- DropIndex
DROP INDEX "public"."AuditLog_entityType_idx";

-- AlterTable
ALTER TABLE "public"."AuditLog" DROP COLUMN "after",
DROP COLUMN "before",
ADD COLUMN     "details" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "actorEmail" DROP NOT NULL,
DROP COLUMN "action",
ADD COLUMN     "action" "public"."AuditAction" NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType", "entityId");
