import { GAME_EVENTS } from './events.interfaces';

export interface Gamer {
  userId: number;
  username: string;
  avatar?: string;
}

export interface GameSession {
  gameId: number;
  participants: Map<number, Gamer>;
  observers: Map<number, Gamer>;
  state: OnlineGameStates;
  events: { event: GAME_EVENTS; data: { id: number; data: unknown } }[];
}

export enum OnlineGameStates {
  Waiting,
  Playing,
  Playing_with_bot,
  Finished,
}
