/*
  Warnings:

  - You are about to drop the column `permission` on the `users` table. All the data in the column will be lost.
  - Made the column `userId` on table `roles` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."roles" DROP CONSTRAINT "roles_userId_fkey";

-- AlterTable
ALTER TABLE "authorization_codes" ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "permission";

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
