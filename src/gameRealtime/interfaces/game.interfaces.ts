export interface GameSession {
  gameId: number;
  participantIds: number[];
  observerIds: number[];
  state: OnlineGameStates;
}

export enum OnlineGameStates {
  Waiting,
  Playing,
  Finished,
}
