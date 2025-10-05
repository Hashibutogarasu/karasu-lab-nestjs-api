-- AlterTable
ALTER TABLE "users" ADD COLUMN     "providers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "extra_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT,
    "avatar_url" TEXT,
    "raw_profile" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extra_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_states" (
    "id" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "one_time_token" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "callback_url" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extra_profiles_user_id_provider_idx" ON "extra_profiles"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "extra_profiles_provider_id_provider_key" ON "extra_profiles"("provider_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "auth_states_state_code_key" ON "auth_states"("state_code");

-- CreateIndex
CREATE UNIQUE INDEX "auth_states_one_time_token_key" ON "auth_states"("one_time_token");

-- CreateIndex
CREATE INDEX "auth_states_state_code_idx" ON "auth_states"("state_code");

-- CreateIndex
CREATE INDEX "auth_states_one_time_token_idx" ON "auth_states"("one_time_token");

-- AddForeignKey
ALTER TABLE "extra_profiles" ADD CONSTRAINT "extra_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
