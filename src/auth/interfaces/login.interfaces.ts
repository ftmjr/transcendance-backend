import { User } from '@prisma/client';

export interface ILoginData {
  accessToken: string;
  user: User;
}
