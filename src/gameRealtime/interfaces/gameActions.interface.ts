export enum PAD_DIRECTION {
  up,
  down,
  none,
}

export enum GAME_STATE {
  waiting,
  ballServing,
  playing,
  scored,
  finished,
}

export enum GAME_RESULT {
  victory,
  defeat,
  draw,
}

export type BallServedData = [
  { x: number; y: number },
  { x: number; y: number },
];

export enum GAME_ACTION_TYPE {
  PAD_DIRECTION = 'PAD_DIRECTION',
  BALL_SERVED = 'BALL_SERVED',
  GAME_STATE = 'GAME_STATE',
  GAME_RESULT = 'GAME_RESULT',
}
