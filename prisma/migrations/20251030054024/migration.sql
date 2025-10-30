/*
  Warnings:

  - You are about to drop the column `pending` on the `external_provider_access_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `pending` on the `extra_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "external_provider_access_tokens" DROP COLUMN "pending",
ADD COLUMN     "linkingVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "extra_profiles" DROP COLUMN "pending",
ADD COLUMN     "linkingVerified" BOOLEAN NOT NULL DEFAULT false;
