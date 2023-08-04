-- DropForeignKey
ALTER TABLE "ChatRoomMember" DROP CONSTRAINT "ChatRoomMember_chatroomId_fkey";

-- DropForeignKey
ALTER TABLE "ChatRoomMember" DROP CONSTRAINT "ChatRoomMember_memberId_fkey";

-- DropForeignKey
ALTER TABLE "ChatroomMessage" DROP CONSTRAINT "ChatroomMessage_chatroomId_fkey";

-- DropForeignKey
ALTER TABLE "ChatroomMessage" DROP CONSTRAINT "ChatroomMessage_memberId_fkey";

-- DropForeignKey
ALTER TABLE "CompetitionParticipation" DROP CONSTRAINT "CompetitionParticipation_competitionId_fkey";

-- DropForeignKey
ALTER TABLE "CompetitionParticipation" DROP CONSTRAINT "CompetitionParticipation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_contactId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_userId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_competitionId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_winnerId_fkey";

-- DropForeignKey
ALTER TABLE "GameHistory" DROP CONSTRAINT "GameHistory_gameId_fkey";

-- DropForeignKey
ALTER TABLE "GameHistory" DROP CONSTRAINT "GameHistory_userId_fkey";

-- DropForeignKey
ALTER TABLE "GameObservation" DROP CONSTRAINT "GameObservation_gameId_fkey";

-- DropForeignKey
ALTER TABLE "GameObservation" DROP CONSTRAINT "GameObservation_userId_fkey";

-- DropForeignKey
ALTER TABLE "GameParticipation" DROP CONSTRAINT "GameParticipation_gameId_fkey";

-- DropForeignKey
ALTER TABLE "GameParticipation" DROP CONSTRAINT "GameParticipation_userId_fkey";

-- DropForeignKey
ALTER TABLE "PrivateMessage" DROP CONSTRAINT "PrivateMessage_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "PrivateMessage" DROP CONSTRAINT "PrivateMessage_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_userId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileAward" DROP CONSTRAINT "ProfileAward_awardId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileAward" DROP CONSTRAINT "ProfileAward_profileId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoomMember" ADD CONSTRAINT "ChatRoomMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoomMember" ADD CONSTRAINT "ChatRoomMember_chatroomId_fkey" FOREIGN KEY ("chatroomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatroomMessage" ADD CONSTRAINT "ChatroomMessage_chatroomId_fkey" FOREIGN KEY ("chatroomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatroomMessage" ADD CONSTRAINT "ChatroomMessage_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ChatRoomMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateMessage" ADD CONSTRAINT "PrivateMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateMessage" ADD CONSTRAINT "PrivateMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileAward" ADD CONSTRAINT "ProfileAward_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileAward" ADD CONSTRAINT "ProfileAward_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "Award"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameParticipation" ADD CONSTRAINT "GameParticipation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameParticipation" ADD CONSTRAINT "GameParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameObservation" ADD CONSTRAINT "GameObservation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameObservation" ADD CONSTRAINT "GameObservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionParticipation" ADD CONSTRAINT "CompetitionParticipation_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionParticipation" ADD CONSTRAINT "CompetitionParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameHistory" ADD CONSTRAINT "GameHistory_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameHistory" ADD CONSTRAINT "GameHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
