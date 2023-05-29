import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './login.model';
@Injectable()
export class LoginService {
  private users: User[] = [];
  insertUser(title: string, desc: string, price: number) {
    const userId = 1;
    const newUser = new User(new Date().toString(), title, desc, price);
    this.users.push(newUser);
    return userId;
  }
  getUsers() {
    return [...this.users];
  }
  getSingleUser(userId: string) {
    const user = this.users.find((use) => use.id === userId);
    if (!user) {
      throw new NotFoundException('Could not find user');
    }
    return {...user}
  }
}
