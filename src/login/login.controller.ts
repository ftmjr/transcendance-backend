import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import {LoginService} from "./login.service";

@Controller('login')
export class LoginController {
    constructor(private readonly loginService: LoginService) {};
    @Post()
    addUser(
        @Body('title') userTitle : string,
        @Body('desc') userDesc: string,
        @Body('price') userPrice: number,
    ): any {
        const generatedId = this.loginService.insertUser(userTitle, userDesc, userPrice);
        return {id: generatedId };
    }
    @Get()
    getAllUsers() {
        return this.loginService.getUsers();
    }
    @Get(':id')
    getUser(@Param('id') userId: string,) {
        return this.loginService.getSingleUser(userId);
    }
}