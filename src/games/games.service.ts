import { Injectable } from '@nestjs/common';
import { GamesRepository } from './games.repository';
import { Game, GameHistory, Prisma, User } from '@prisma/client';
import { GameEvent } from '.prisma/client';

@Injectable()
export class GamesService {
  constructor(private repository: GamesRepository) {}
  create(data: Prisma.GameCreateInput, include?: Prisma.GameInclude) {
    return this.repository.createGame({
      data,
      include,
    });
  }

  addParticipant(params: { gameId: number; userId: number }) {
    const { gameId, userId } = params;
    return this.repository.createParticipant({ gameId, userId });
  }

  addObserver(params: { gameId: number; userId: number }) {
    const { gameId, userId } = params;
    return this.repository.createObserver({ gameId, userId });
  }

  addHistory(params: {
    gameId: GameHistory[`gameId`];
    userId: GameHistory[`userId`];
    event: GameHistory[`event`];
  }) {
    const { gameId, userId, event } = params;
    return this.repository.createGameHistory({
      data: {
        event,
        game: {
          connect: {
            id: gameId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  findAll() {
    return this.repository.getGames({});
  }

  getPaginatedGames(params: {
    skip?: number;
    take?: number;
    cursor?: Game[`id`];
    where?: Prisma.GameWhereInput;
    orderBy?: Prisma.GameOrderByWithRelationInput;
  }) {
    const { skip, take, cursor, where, orderBy } = params;
    return this.repository.getGames({
      skip,
      take,
      cursor: { id: cursor },
      where,
      orderBy,
      include: {
        competition: true,
        participants: true,
        observers: true,
      },
    });
  }

  findOne(id: Game[`id`]) {
    return this.repository.getGame({
      where: { id },
      include: {
        competition: true,
        participants: true,
        observers: true,
      },
    });
  }
  getParticipants(id: Game[`id`]) {
    return this.repository.getParticipants(id);
  }

  getObservers(id: Game[`id`]) {
    return this.repository.getObservers(id);
  }

  update(params: { id: Game[`id`]; data: Prisma.GameUpdateInput }) {
    const { id, data } = params;
    return this.repository.updateGame({
      where: { id },
      data,
    });
  }

  remove(id: Game[`id`]) {
    return this.repository.deleteGame({
      where: { id },
    });
  }
}
