-- AlterTable
ALTER TABLE "auth_states" ADD COLUMN     "code_challenge" TEXT,
ADD COLUMN     "code_challenge_method" TEXT,
ADD COLUMN     "code_verifier" TEXT;
