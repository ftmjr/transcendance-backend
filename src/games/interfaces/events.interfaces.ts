import { Gamer } from './game.interfaces';

export enum GAME_EVENTS {
  ViewGame = 'view-game',
  showViewer = 'reloadViewersList',
  ViewersRetrieved = 'viewers-retrieved',
  ViewerAdded = 'viewer-added',
  JoinGame = 'joinGame',
  showPlayers = 'reloadPlayersList',
  PlayersRetrieved = 'players-retrieved',
  PlayerAdded = 'player-added',
  PadMoved = 'padMoved',
  BallServed = 'ballServed',
  GameStateChanged = 'gameStateChanged',
  GameMonitorStateChanged = 'gameMonitorStateChanged',
  HostChanged = 'hostChanged',
  ScoreChanged = 'scoreChanged',
}

export enum GameUserType {
  Player,
  Viewer,
}

export interface JoinGameData {
  user: Gamer;
  roomId: number;
  userType: GameUserType;
  competitionId?: number;
}
