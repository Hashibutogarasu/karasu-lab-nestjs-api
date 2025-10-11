/*
  Warnings:

  - You are about to drop the `ExternalProviderAccessToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ExternalProviderAccessToken" DROP CONSTRAINT "ExternalProviderAccessToken_user_id_fkey";

-- DropTable
DROP TABLE "public"."ExternalProviderAccessToken";

-- CreateTable
CREATE TABLE "external_provider_access_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_provider_access_tokens_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "external_provider_access_tokens" ADD CONSTRAINT "external_provider_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
