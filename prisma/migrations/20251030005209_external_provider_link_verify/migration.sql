-- CreateTable
CREATE TABLE "ExternalProviderLinkVerify" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "rawExternalProviderProfile" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalProviderLinkVerify_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExternalProviderLinkVerify" ADD CONSTRAINT "ExternalProviderLinkVerify_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
