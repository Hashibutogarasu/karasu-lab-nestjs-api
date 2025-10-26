/*
  Warnings:

  - Changed the type of `created_at` on the `user_otp` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `updated_at` on the `user_otp` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "user_otp" DROP COLUMN "created_at",
ADD COLUMN     "created_at" BIGINT NOT NULL,
DROP COLUMN "updated_at",
ADD COLUMN     "updated_at" BIGINT NOT NULL;

-- CreateTable
CREATE TABLE "OAuthClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,
    "redirect_uris" TEXT[],
    "permission_bit_mask" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthGrantedToken" (
    "jti" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission_bit_mask" BIGINT NOT NULL,
    "expiry_at" TIMESTAMP(3) NOT NULL,
    "client_id" TEXT NOT NULL,

    CONSTRAINT "OAuthGrantedToken_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthGrantedToken_jti_key" ON "OAuthGrantedToken"("jti");

-- AddForeignKey
ALTER TABLE "OAuthGrantedToken" ADD CONSTRAINT "OAuthGrantedToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthGrantedToken" ADD CONSTRAINT "OAuthGrantedToken_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "OAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
