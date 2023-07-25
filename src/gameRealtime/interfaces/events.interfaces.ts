export enum GAME_EVENTS {
  ViewGame = 'view-game',
  ViewersRetrieved = 'viewers-retrieved',
  ViewerAdded = 'viewer-added',
  JoinGame = 'joinGame',
  PlayersRetrieved = 'players-retrieved',
  PlayerAdded = 'player-added',
  PadMoved = 'padMoved',
  BallServed = 'ballServed',
  GameStateChanged = 'gameStateChanged',
  ScoreChanged = 'scoreChanged',
  GameResult = 'gameResult',
}

export enum GameUserType {
  Player,
  Viewer,
  LocalPlayer,
}
