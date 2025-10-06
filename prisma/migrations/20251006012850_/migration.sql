-- AlterTable
ALTER TABLE "auth_states" ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "auth_states_user_id_idx" ON "auth_states"("user_id");

-- AddForeignKey
ALTER TABLE "auth_states" ADD CONSTRAINT "auth_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
