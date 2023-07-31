import { GAME_EVENTS } from './events.interfaces';
import { PAD_DIRECTION } from './gameActions.interface';

export interface Gamer {
  userId: number;
  username: string;
  avatar?: string;
}

export enum GameMonitorState {
  Waiting,
  Ready, // all players are ready, waiting for users to click on start
  InitGame, // players have accepted to start, server allowing the game scene to start
  PlayingSceneLoaded, // scene is running
  Ended,
}

export enum OnlineGameStates {
  Waiting,
  Playing,
  Playing_with_bot,
  Finished,
}

export interface GameSession {
  gameId: number;
  participants: Map<number, Gamer>;
  hostId: number;
  observers: Map<number, Gamer>;
  score: Map<number, number>;
  state: OnlineGameStates;
  monitors: Array<GameMonitorState>;
  events: { event: GAME_EVENTS; data: { id: number; data: unknown } }[];
}

export interface BallServedData {
  userId: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
}
export interface PadMovedData {
  userId: number;
  direction: PAD_DIRECTION;
}
