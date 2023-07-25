import { GameUser } from './game.dto';
import { IsNotEmpty, IsNumber } from 'class-validator';
import {
  BallServedData,
  GAME_RESULT,
  GAME_STATE,
  PAD_DIRECTION,
} from '../interfaces/gameActions.interface';

type GameActionData = PAD_DIRECTION | BallServedData | GAME_STATE | GAME_RESULT;
export class GameActionDto {
  @IsNumber()
  @IsNotEmpty()
  roomId: number;
  user: GameUser;
  @IsNotEmpty()
  isIA: boolean;
  actionData: GameActionData[];
}
