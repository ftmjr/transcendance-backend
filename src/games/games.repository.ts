import { Injectable } from '@nestjs/common';
import {
  Game,
  GameHistory,
  GameObservation,
  GameParticipation,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GamesRepository {
  constructor(private prisma: PrismaService) {}

  async createGame(params: {
    data: Prisma.GameCreateInput;
    include?: Prisma.GameInclude;
  }): Promise<Game> {
    const { data, include } = params;
    return this.prisma.game.create({ data, include });
  }

  createParticipant(params: { gameId: number; userId: number }): Promise<Game> {
    const { gameId, userId } = params;
    return this.prisma.game.update({
      where: { id: gameId },
      data: {
        participants: {
          connect: {
            gameId_userId: {
              gameId,
              userId,
            },
          },
        },
      },
      include: {
        participants: true,
        observers: true,
        competition: true,
      },
    });
  }

  createObserver(params: { gameId: number; userId: number }): Promise<Game> {
    const { gameId, userId } = params;
    return this.prisma.game.update({
      where: { id: gameId },
      data: {
        observers: {
          connect: {
            gameId_userId: {
              gameId,
              userId,
            },
          },
        },
      },
      include: {
        participants: true,
        observers: true,
        competition: true,
      },
    });
  }

  async getParticipants(gameId: number): Promise<GameParticipation[]> {
    return this.prisma.gameParticipation.findMany({
      where: { gameId },
    });
  }

  async getObservers(gameId: number): Promise<GameObservation[]> {
    return this.prisma.gameObservation.findMany({
      where: { gameId },
    });
  }

  async getGames(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.GameWhereUniqueInput;
    where?: Prisma.GameWhereInput;
    orderBy?: Prisma.GameOrderByWithRelationInput;
    include?: Prisma.GameInclude;
  }): Promise<Game[]> {
    const { skip, take, cursor, where, orderBy, include } = params;
    return this.prisma.game.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include,
    });
  }

  async updateGame(params: {
    where: Prisma.GameWhereUniqueInput;
    data: Prisma.GameUpdateInput;
  }): Promise<Game> {
    const { where, data } = params;
    return this.prisma.game.update({ where, data });
  }

  async deleteGame(params: {
    where: Prisma.GameWhereUniqueInput;
  }): Promise<Game> {
    const { where } = params;
    return this.prisma.game.delete({ where });
  }

  async getGame(params: {
    where: Prisma.GameWhereUniqueInput;
    include?: Prisma.GameInclude;
  }): Promise<Game | null> {
    const { where, include } = params;
    return this.prisma.game.findUnique({ where, include: include });
  }
  getGameHistory(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.GameHistoryWhereUniqueInput;
    where?: Prisma.GameHistoryWhereInput;
    orderBy?: Prisma.GameHistoryOrderByWithRelationInput;
    include?: Prisma.GameHistoryInclude;
  }): Promise<GameHistory[]> {
    const { skip, take, cursor, where, orderBy, include } = params;
    return this.prisma.gameHistory.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include,
    });
  }
  createGameHistory(params: {
    data: Prisma.GameHistoryCreateInput;
    include?: Prisma.GameHistoryInclude;
  }): Promise<GameHistory> {
    const { data, include } = params;
    return this.prisma.gameHistory.create({ data, include });
  }
}
