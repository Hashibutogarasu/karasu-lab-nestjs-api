-- CreateTable
CREATE TABLE "pending_email_change_processes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "new_email" TEXT NOT NULL,
    "verification_code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_email_change_processes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_email_change_processes_new_email_idx" ON "pending_email_change_processes"("new_email");

-- AddForeignKey
ALTER TABLE "pending_email_change_processes" ADD CONSTRAINT "pending_email_change_processes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
