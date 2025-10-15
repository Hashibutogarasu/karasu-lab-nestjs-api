/*
  Warnings:

  - Made the column `user_id` on table `authorization_codes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "authorization_codes" ALTER COLUMN "user_id" SET NOT NULL;
