import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';


@Injectable()
export class ChatRepository {
    constructor(private prisma: PrismaService) {
    }
    async createRoom() {
        return 0;
    }
}