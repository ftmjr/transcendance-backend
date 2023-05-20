import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Resolver()
export class UsersResolver {
    constructor(private readonly usersService: UsersService) {}

    @Query(() => [User])
    async getUsers() {
        return this.usersService.getUsers();
    }
    @Mutation(() => User)
    async createUser(
        @Args({ name: 'name', type: () => String }) name: string,
        @Args({ name: 'email', type: () => String }) email: string,
    ) {
        return this.usersService.createUser({name, email});
    }
}

