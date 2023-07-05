import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

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
}
