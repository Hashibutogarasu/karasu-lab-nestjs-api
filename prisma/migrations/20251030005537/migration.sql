/*
  Warnings:

  - Added the required column `verifyHashedCode` to the `ExternalProviderLinkVerify` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExternalProviderLinkVerify" ADD COLUMN     "verifyHashedCode" TEXT NOT NULL;
