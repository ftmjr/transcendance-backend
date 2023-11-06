export enum GAME_EVENTS {
  JoinGame = 'joinGame',
  HostChanged = 'hostChanged',
  GameMonitorStateChanged = 'gameMonitorStateChanged',
  GameStateChanged = 'gameStateChanged',
  ScoreChanged = 'scoreChanged',
  PadMoved = 'padMoved',
  IaPadSpeed = 'iaPadSpeed',
  BallServed = 'ballServed',
  PlayersRetrieved = 'players-retrieved',
  PlayerAdded = 'player-added',
  ViewersRetrieved = 'viewers-retrieved',
  ViewerAdded = 'viewer-added',
  reloadPlayersList = 'reloadPlayersList',
  reloadViewersList = 'reloadViewersList',
  GameObjectState = 'gameObjectState',
  PlayerLeft = 'player-left',
}

export enum GameUserType {
  Player,
  Viewer,
}
