import { GameUser } from './dto';
import { PAD_DIRECTION } from './interfaces';
import { ArcadePhysics } from 'arcade-physics';
import { Body } from 'arcade-physics/lib/physics/arcade/Body';
import { GameGateway } from './game.gateway';
import { GameRealtimeService } from './gameRealtime.service';

const DEFAULT_BOUNCE = { x: 0, y: 1.2 };
const DECELERATION_FACTOR = 0.9;
const IA_DECELERATION_FACTOR = 0.2;
const BALL_RADIUS = 20; // Radius of the ball
const BALL_DIAMETER = BALL_RADIUS * 2; // Diameter of the ball
const PADDLE_WIDTH = 32; // Width of the paddle
const PADDLE_HEIGHT = 128; // Height of the paddle
const IA_VELOCITY = 375;
export interface PaddleEngineData {
  userId: number;
  direction: PAD_DIRECTION;
  position: { x: number; y: number };
  speed: { x: number; y: number };
}

interface PaddleState {
  userId: number;
  position: { x: number; y: number };
  speed: { x: number; y: number };
  direction: PAD_DIRECTION;
}

interface BallState {
  position: { x: number; y: number };
  speed: { x: number; y: number };
}

interface ScoreState {
  userId: number;
  score: number;
}

export interface GameStateDataPacket {
  timestamp: number;
  paddles: PaddleState[];
  ball: BallState;
  scores: ScoreState[];
}

export enum EngineState {
  PAUSED = 'paused',
  RUNNING = 'running',
  STOPPED = 'stopped',
}

class Paddle {
  public readonly body: Body;

  constructor(
    public readonly id: number,
    physics: ArcadePhysics,
    public readonly startPosition: { x: number; y: number },
    public readonly averageSpeed: number,
  ) {
    this.body = physics.add.body(
      startPosition.x,
      startPosition.y,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
    );
    this.initializeBody();
  }

  private initializeBody(): void {
    this.body.setBounce(DEFAULT_BOUNCE.x, DEFAULT_BOUNCE.y);
    this.body.setImmovable(true);
    this.body.pushable = false;
    this.body.setMass(1000);
    this.body.setCollideWorldBounds(
      true,
      DEFAULT_BOUNCE.x,
      DEFAULT_BOUNCE.y,
      undefined,
    );
  }

  applyDeceleration(): void {
    const currentVelocity = this.body?.velocity.y ?? 0;
    if (currentVelocity === 0) return;
    if (this.id === 0) {
      this.body.setVelocityY(currentVelocity * IA_DECELERATION_FACTOR);
    } else {
      this.body.setVelocityY(currentVelocity * DECELERATION_FACTOR);
    }
  }
  updateAiPlayer(ballPosition: { x: number; y: number }) {
    if (this.id !== 0) return;
    const min_position = 300;
    const max_position = 1300;
    // code to check if ball is in a surface between min_position and max_position
    if (ballPosition.x > min_position && ballPosition.x < max_position) {
      const speedArray = [IA_VELOCITY, IA_VELOCITY * 1.5, IA_VELOCITY * 1.8];
      // select one of the element of speedArray randomly
      const randomSpeed =
        speedArray[Math.floor(Math.random() * speedArray.length)];
      const distance = ballPosition.y - this.body.y;
      if (distance > 32) {
        this.body.setVelocityY(randomSpeed);
        return;
      } else if (distance < -32) {
        this.body.setVelocityY(-randomSpeed);
        return;
      }
    }
  }

  move(direction: PAD_DIRECTION): PaddleEngineData {
    switch (direction) {
      case PAD_DIRECTION.up:
        this.body.setVelocityY(-this.averageSpeed);
        break;
      case PAD_DIRECTION.down:
        this.body.setVelocityY(this.averageSpeed);
        break;
      default:
        this.applyDeceleration();
        break;
    }
    return {
      userId: this.id,
      direction,
      position: { x: this.body.x, y: this.body.y },
      speed: { x: this.body.velocity.x, y: this.body.velocity.y },
    };
  }
}

class Ball {
  public needToServe = true;
  public body: Body;
  constructor(
    physics: ArcadePhysics,
    public startPosition: { x: number; y: number },
    public maxSpeed: number,
  ) {
    this.body = physics.add.body(
      startPosition.x - BALL_RADIUS,
      startPosition.y - BALL_RADIUS,
      BALL_DIAMETER,
      BALL_DIAMETER,
    );
    this.body.setCircle(BALL_RADIUS);
    this.body.setBounce(1, 1);
    this.body.setMass(1);
    this.body.setCollideWorldBounds(true, 1, 1, undefined);
    this.body.setMaxVelocity(maxSpeed, maxSpeed);
  }

  serve(velocity: { x: number; y: number }) {
    if (!this.needToServe) return;
    this.needToServe = false;
    this.body.setEnable(true);
    this.body.reset(this.startPosition.x, this.startPosition.y);
    this.body.setVelocity(velocity.x, velocity.y);
  }
}

class TrackableState {
  private state: GameStateDataPacket;
  private changedProperties: Set<keyof GameStateDataPacket> = new Set();

  constructor(initialState: GameStateDataPacket) {
    this.state = new Proxy(initialState, {
      set: (target, property, value) => {
        target[property] = value;
        this.changedProperties.add(property as keyof GameStateDataPacket);
        return true;
      },
    });
  }

  get timestamp() {
    return this.state.timestamp;
  }

  set timestamp(value: number) {
    this.state.timestamp = value;
    this.changedProperties.add('timestamp');
  }

  get paddles() {
    return this.state.paddles;
  }

  set paddles(value: PaddleState[]) {
    this.state.paddles = value;
    this.changedProperties.add('paddles');
  }

  get ball() {
    return this.state.ball;
  }

  set ball(value: BallState) {
    this.state.ball = value;
    this.changedProperties.add('ball');
  }

  get scores() {
    return this.state.scores;
  }

  set scores(value: ScoreState[]) {
    this.state.scores = value;
    this.changedProperties.add('scores');
  }

  getChangedProperties(): Partial<GameStateDataPacket> {
    const changes: Partial<GameStateDataPacket> = {};
    for (const key of this.changedProperties) {
      switch (key) {
        case 'timestamp':
          changes.timestamp = this.state.timestamp;
          break;
        case 'paddles':
          changes.paddles = this.state.paddles as PaddleState[];
          break;
        case 'ball':
          changes.ball = this.state.ball as BallState;
          break;
        case 'scores':
          changes.scores = this.state.scores as ScoreState[];
          break;
      }
    }
    this.changedProperties.clear();
    return changes;
  }
}

export default class GameEngine {
  private readonly paddles: Paddle[] = [];
  private readonly ball: Ball;
  private readonly physics: ArcadePhysics;
  private timer: NodeJS.Timer;
  public timestamp = 0;
  private isLoopActive = false;
  public state: EngineState = EngineState.RUNNING;
  private readonly frameRate = 60; // 60 frames per second
  private readonly timePerFrame = 1000 / this.frameRate;
  private lastToScore = 0;
  private gameState: TrackableState;

  constructor(
    private readonly roomId: number,
    private readonly players: GameUser[],
    private readonly _realtimeService: GameRealtimeService,
    private readonly _gameGateway: GameGateway,
    private readonly scores: Map<number, number>,
  ) {
    this.physics = this.initializePhysics();
    this.paddles = this.initializePaddles();
    this.ball = this.initializeBall();
    this.initializeColliders();
    this.timestamp = Date.now();
    this.gameState = new TrackableState({
      timestamp: this.timestamp,
      paddles: this.paddles.map((paddle) => ({
        userId: paddle.id,
        position: { x: paddle.body.x, y: paddle.body.y },
        speed: { x: paddle.body.velocity.x, y: paddle.body.velocity.y },
        direction: PAD_DIRECTION.none,
      })),
      ball: {
        position: { x: this.ball.body.x, y: this.ball.body.y },
        speed: { x: this.ball.body.velocity.x, y: this.ball.body.velocity.y },
      },
      scores: this.arrayOfPlayersWithScore(),
    } as GameStateDataPacket);
  }

  private initializePhysics(): ArcadePhysics {
    const physics = new ArcadePhysics({
      width: 1334,
      height: 750,
      gravity: { x: 0, y: 0 },
    });
    physics.world.setBoundsCollision(true, true, true, true);
    return physics;
  }

  private initializePaddles(): Paddle[] {
    return this.players.map((player, index) => {
      const middle = 375 - PADDLE_HEIGHT / 2;
      const playerPosition =
        index === 0 ? { x: 100, y: middle } : { x: 1234, y: middle };
      return new Paddle(player.userId, this.physics, playerPosition, 750);
    });
  }

  private initializeBall(): Ball {
    return new Ball(this.physics, { x: 667, y: 375 }, 375);
  }

  private initializeColliders(): void {
    this.physics.add.collider(
      this.ball.body,
      this.paddles[0].body,
      this.handleBallPaddleCollision.bind(this),
    );
    this.physics.add.collider(
      this.ball.body,
      this.paddles[1].body,
      this.handleBallPaddleCollision.bind(this),
    );

    // add two line to the left and right of the screen
    const leftLine = this.physics.add.body(0, 0, 5, 750);
    leftLine.setImmovable(true);
    leftLine.pushable = false;
    const rightLine = this.physics.add.body(1330, 0, 5, 750);
    rightLine.setImmovable(true);
    rightLine.pushable = false;
    // add collision between ball and lines
    this.physics.add.collider(
      this.ball.body,
      leftLine,
      // @ts-expect-error : no type for collide
      (_ball: Body, _leftLine: Body) => {
        this.resetBall();
        this.lastToScore = this.paddles[1].id;
        this._realtimeService.onScoreRoutine(this.paddles[1].id, this.roomId);
        const scores = this.arrayOfPlayersWithScore();
        this._gameGateway.sendScored(this.roomId, scores);
      },
    );
    this.physics.add.collider(
      this.ball.body,
      rightLine,
      // @ts-expect-error : no type for collide
      (_ball: Body, _rightLine: Body) => {
        this.resetBall();
        this.lastToScore = this.paddles[0].id;
        this._realtimeService.onScoreRoutine(this.paddles[0].id, this.roomId);
        const scores = this.arrayOfPlayersWithScore();
        this._gameGateway.sendScored(this.roomId, scores);
      },
    );
  }

  private handleBallPaddleCollision(ballBody: Body, paddleBody: Body): void {
    const yOffset = ballBody.y - paddleBody.y;// To DO
    // Adjust the ball's y-speed based on the yOffset
    const newVelocityY = ballBody.velocity.y + yOffset * 5;
    ballBody.setVelocityY(newVelocityY);
  }

  // return directly data with the correct direction so client can interpolate
  paddleMove(userId: number, direction: PAD_DIRECTION): PaddleEngineData {
    const paddle = this.paddles.find((paddle) => paddle.id === userId);
    if (!paddle) return undefined;
    return paddle.move(direction);
  }

  // called from the incoming players data from the network
  serveBall(_userId: number) {
    const xDirection = Math.random() < 0.5 ? -1 : 1;
    const speedX = xDirection * 300;

    // generate random number between -80 and 80
    const speedY = Math.random() * 160 - 80;
    this.ball.serve({ x: speedX, y: speedY });
  }

  private resetBall() {
    this.ball.body.reset(667, 375); // Reset ball to the center
    this.ball.body.setEnable(false);
    this.ball.needToServe = true;
  }

  private updateAiPlayer() {
    const ballPosition = { x: this.ball.body.x, y: this.ball.body.y };
    const aiPlayer = this.paddles.find((paddle) => paddle.id === 0);
    if (aiPlayer) {
      aiPlayer.updateAiPlayer(ballPosition);
    }
  }

  activateLoop(): void {
    if (this.isLoopActive) {
      return;
    }
    let tick = 0;
    this.timer = setInterval(() => {
      this.physics.world.update(tick * 1000, this.timePerFrame);
      this.updateBallState();
      this.updatePaddleState();
      this.updateScoresState();
      this.updateAiPlayer();
      this.physics.world.postUpdate();
      tick++;
      this.paddles.forEach((paddle) => paddle.applyDeceleration());
      this.sendNewGameStateToUsers();
    }, this.timePerFrame);

    this.isLoopActive = true;
    this.state = EngineState.RUNNING;
  }

  /**
   * Stops the game loop and cleans up resources.
   */
  stopLoop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.physics.destroy();
    this.isLoopActive = false;
    this.state = EngineState.STOPPED;
  }

  /**
   * Pauses the game loop.
   */
  pauseLoop(): void {
    if (!this.isLoopActive) return;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.physics.pause();
    this.isLoopActive = false;
    this.state = EngineState.PAUSED;
  }

  /**
   * Resumes the game loop if it was paused.
   */
  resumeLoop(): void {
    if (this.isLoopActive) {
      console.warn('Game loop is already active.');
      return;
    }

    this.physics.resume();
    this.activateLoop();
  }

  /*
   * Code Optimiser for data
   */
  updatePaddleState(): void {
    this.gameState.paddles = this.paddles.map((p) => {
      return {
        userId: p.id,
        position: { x: p.body.x, y: p.body.y },
        speed: { x: p.body.velocity.x, y: p.body.velocity.y },
        direction: PAD_DIRECTION.none,
      };
    });
  }

  updateBallState(): void {
    this.gameState.ball = {
      position: { x: this.ball.body.x, y: this.ball.body.y },
      speed: { x: this.ball.body.velocity.x, y: this.ball.body.velocity.y },
    };
  }

  updateScoresState(): void {
    this.gameState.scores = this.arrayOfPlayersWithScore();
  }

  sendNewGameStateToUsers() {
    this.timestamp = Date.now();
    this.gameState.timestamp = this.timestamp;

    const changesToSend = this.gameState.getChangedProperties();
    if (Object.keys(changesToSend).length > 0) {
      this._gameGateway.sendGameObjectState(
        changesToSend as GameStateDataPacket,
        this.roomId,
      );
    }
  }

  private arrayOfPlayersWithScore(): { userId: number; score: number }[] {
    return Array.from(this.scores.entries()).map(([userId, score]) => ({
      userId,
      score,
    }));
  }
}
