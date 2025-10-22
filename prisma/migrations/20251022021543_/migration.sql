/*
  Warnings:

  - You are about to drop the `clients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_consents` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."access_tokens" DROP CONSTRAINT "access_tokens_client_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."authorization_codes" DROP CONSTRAINT "authorization_codes_client_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."refresh_tokens" DROP CONSTRAINT "refresh_tokens_client_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_consents" DROP CONSTRAINT "user_consents_client_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_consents" DROP CONSTRAINT "user_consents_user_id_fkey";

-- DropTable
DROP TABLE "public"."clients";

-- DropTable
DROP TABLE "public"."user_consents";
