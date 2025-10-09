-- CreateTable
CREATE TABLE "JWTState" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JWTState_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JWTState" ADD CONSTRAINT "JWTState_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
