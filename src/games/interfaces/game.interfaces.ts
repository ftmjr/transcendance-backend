import { GAME_EVENTS } from './events.interfaces';
import { PAD_DIRECTION } from './gameActions.interface';

export interface Gamer {
  userId: number;
  username: string;
  clientId: string;
  avatar?: string;
  isHost?: boolean;
}

export enum GameMonitorState {
  Waiting, // waiting for players to join
  Ready, // all players are ready, waiting for users to click on start
  InitGame, // players have accepted to start, server allowing the game scene to start
  PlayingSceneLoaded, // playing scene loading finished on all clients
  Ended, // game ended by server or by a player (disconnection)
}

export enum OnlineGameStates {
  WAITING,
  PLAYING,
  PLAYING_AI,
  FINISHED,
}

export enum GameSessionType {
  Bot,
  QueListGame,
  CompetitionGame,
  PrivateGame,
}

export type ManagedTheme = 'Classic' | 'Arcade' | 'Soccer';
export interface GameRules {
  maxScore: number;
  maxTime: number;
  theme?: ManagedTheme;
}

export interface GameSession {
  gameId: number;
  hostId: number;
  type: GameSessionType;
  participants: Gamer[];
  observers: Gamer[];
  score: Map<number, number>;
  state: OnlineGameStates;
  monitors: Array<GameMonitorState>;
  eventsToPublishInRoom: {
    event: GAME_EVENTS;
    data: { roomId: number; data: unknown };
  }[];
  rules: GameRules;
}
