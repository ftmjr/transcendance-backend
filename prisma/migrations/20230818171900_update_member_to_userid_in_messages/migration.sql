/*
  Warnings:

  - You are about to drop the column `memberId` on the `ChatRoomMessage` table. All the data in the column will be lost.
  - Added the required column `userId` to the `ChatRoomMessage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ChatRoomMessage" DROP CONSTRAINT "ChatRoomMessage_memberId_fkey";

-- AlterTable
ALTER TABLE "ChatRoomMessage" DROP COLUMN "memberId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "ChatRoomMessage" ADD CONSTRAINT "ChatRoomMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
