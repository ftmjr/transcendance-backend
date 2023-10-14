export enum GAME_EVENTS {
  JoinGame = 'joinGame',
  HostChanged = 'hostChanged',
  GameMonitorStateChanged = 'gameMonitorStateChanged',
  GameStateChanged = 'gameStateChanged',
  Scored = 'scored',
  ScoreChanged = 'scoreChanged',
  PadMoved = 'padMoved',
  BallServed = 'ballServed',
  PlayersRetrieved = 'players-retrieved',
  PlayerAdded = 'player-added',
  ViewersRetrieved = 'viewers-retrieved',
  ViewerAdded = 'viewer-added',
  reloadPlayersList = 'reloadPlayersList',
  reloadViewersList = 'reloadViewersList',
}

export enum GameUserType {
  Player,
  Viewer,
}
