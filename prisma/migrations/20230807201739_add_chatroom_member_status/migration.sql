-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Online', 'Offline', 'Away', 'Busy');

-- AlterTable
ALTER TABLE "ChatRoomMember" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'Offline';
