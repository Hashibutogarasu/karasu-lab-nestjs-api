-- AlterTable
ALTER TABLE "JWTState" ADD COLUMN     "session_id" TEXT;

-- AddForeignKey
ALTER TABLE "JWTState" ADD CONSTRAINT "JWTState_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
