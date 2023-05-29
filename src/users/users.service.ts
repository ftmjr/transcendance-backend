import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
    constructor(private repository: UsersRepository) {}

    async createUser(params: { name: User[`name`]; email: User[`email`]}) {
        const { name, email } = params;

        // call repository layer
        const user = await this.repository.createUser({
            data: {
                name,
                email,
            },
        });
        // add other verification or whatever
        return user;
    }
    async getUsers() {
        const users = await this.repository.getUsers({});
        return users;
    }
}
