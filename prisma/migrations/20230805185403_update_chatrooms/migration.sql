/*
  Warnings:

  - Added the required column `password` to the `ChatRoom` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `ChatRoomMember` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'OWNER';

-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "protected" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ChatRoomMember" ADD COLUMN     "role" "Role" NOT NULL;
