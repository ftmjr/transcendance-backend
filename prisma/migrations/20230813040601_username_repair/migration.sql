/*
  Warnings:

  - You are about to drop the column `status` on the `ChatRoomMember` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'BAN';

-- AlterTable
ALTER TABLE "ChatRoomMember" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'Offline';
