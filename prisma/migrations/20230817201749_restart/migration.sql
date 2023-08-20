-- CreateTable
CREATE TABLE "GeneralMessage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneralMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GeneralMessage" ADD CONSTRAINT "GeneralMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
