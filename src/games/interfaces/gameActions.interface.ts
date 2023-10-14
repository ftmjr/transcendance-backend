export enum PAD_DIRECTION {
  up,
  down,
  none,
}

export enum GAME_STATE {
  waiting,
  playing,
}

export interface PadMovedData {
  userId: number;
  direction: PAD_DIRECTION;
}

export interface BallServedData {
  userId: number;
  position: { x: number; y: number };
  direction: { x: number; y: number };
}
