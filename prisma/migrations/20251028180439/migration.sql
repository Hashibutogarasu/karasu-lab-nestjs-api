/*
  Warnings:

  - You are about to alter the column `permission_bit_mask` on the `OAuthClient` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `permission_bit_mask` on the `OAuthGrantedToken` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - Added the required column `user_id` to the `OAuthClient` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OAuthClient" ADD COLUMN     "user_id" TEXT NOT NULL,
ALTER COLUMN "permission_bit_mask" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "OAuthGrantedToken" ALTER COLUMN "permission_bit_mask" SET DATA TYPE INTEGER;

-- AddForeignKey
ALTER TABLE "OAuthClient" ADD CONSTRAINT "OAuthClient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
