export enum PAD_DIRECTION {
  up,
  down,
  none,
}

export enum GAME_STATE {
  waiting,
  playing,
  scored,
}

export type BallServedData = [
  { x: number; y: number },
  { x: number; y: number },
];
