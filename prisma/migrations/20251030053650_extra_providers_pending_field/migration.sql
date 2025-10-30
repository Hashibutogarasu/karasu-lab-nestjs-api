-- AlterTable
ALTER TABLE "external_provider_access_tokens" ADD COLUMN     "pending" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "extra_profiles" ADD COLUMN     "pending" BOOLEAN NOT NULL DEFAULT true;
