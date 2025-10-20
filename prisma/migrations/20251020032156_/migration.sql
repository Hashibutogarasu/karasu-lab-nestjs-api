-- CreateTable
CREATE TABLE "user_otp" (
    "id" TEXT NOT NULL,
    "secret_encrypted" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_authenticated_at" TIMESTAMP(3),
    "issuer_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "setup_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_backup_codes" (
    "id" TEXT NOT NULL,
    "hashed_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_otp_id" TEXT NOT NULL,

    CONSTRAINT "otp_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_otp_user_id_idx" ON "user_otp"("user_id");

-- CreateIndex
CREATE INDEX "user_otp_issuer_id_idx" ON "user_otp"("issuer_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_otp_user_id_key" ON "user_otp"("user_id");

-- CreateIndex
CREATE INDEX "otp_backup_codes_user_otp_id_idx" ON "otp_backup_codes"("user_otp_id");

-- AddForeignKey
ALTER TABLE "user_otp" ADD CONSTRAINT "user_otp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_otp" ADD CONSTRAINT "user_otp_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_backup_codes" ADD CONSTRAINT "otp_backup_codes_user_otp_id_fkey" FOREIGN KEY ("user_otp_id") REFERENCES "user_otp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
