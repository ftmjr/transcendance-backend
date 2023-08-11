import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { GameUserType } from '../interfaces';

export class GameUser {
  @IsNumber()
  @IsNotEmpty()
  userId: number;
  @IsString()
  @IsNotEmpty()
  username: string;
  @IsString()
  avatar?: string;
}

export class JoinGameEvent {
  user: GameUser;
  @IsNumber()
  @IsNotEmpty()
  roomId: number;
  @IsNumber()
  @IsNotEmpty()
  userType: GameUserType;
  @IsNumber()
  competitionId?: number;
}

export class JoinGameResponse {
  worked: boolean;
  @IsNumber()
  @IsNotEmpty()
  roomId: number;
}
