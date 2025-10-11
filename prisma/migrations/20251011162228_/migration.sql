-- CreateTable
CREATE TABLE "ExternalProviderAccessToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalProviderAccessToken_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExternalProviderAccessToken" ADD CONSTRAINT "ExternalProviderAccessToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
