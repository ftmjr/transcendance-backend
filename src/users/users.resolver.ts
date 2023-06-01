import { Args, Mutation, Resolver, Query, Int } from '@nestjs/graphql';
import { User } from './entities';
import { UsersService } from './users.service';

@Resolver()
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => [User])
  async getUsers() {
    return this.usersService.getUsers();
  }

  @Query(() => User)
  async getOneUser(@Args('id', { type: () => Int }) id: number) {
    return this.usersService.getUser({ id });
  }

  @Query(() => User)
  async getUserByEmail(@Args('email', { type: () => String }) email: string) {
    return this.usersService.getUserByEmail(email);
  }

  @Mutation(() => User)
  async createUser(
    @Args({ name: 'username', type: () => String }) username: string,
    @Args({ name: 'email', type: () => String }) email: string,
    @Args({ name: 'password', type: () => String }) password: string,
  ) {
    return this.usersService.createUser({ username, password, email });
  }
}
