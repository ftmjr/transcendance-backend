-- CreateTable
CREATE TABLE "GeneralMember" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneralMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneralMember_memberId_key" ON "GeneralMember"("memberId");

-- AddForeignKey
ALTER TABLE "GeneralMember" ADD CONSTRAINT "GeneralMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
