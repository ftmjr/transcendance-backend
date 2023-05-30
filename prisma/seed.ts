// prisma/seed.ts

import { PrismaClient, Role } from '@prisma/client';

// initialize Prisma Client
const prisma = new PrismaClient();

async function main() {
  const user1 = await prisma.user.upsert({
    where: { id: 0 },
    create: {
      username: 'flahoud',
      email: 'flahoud@email.com',
      password: 'pass1234',
      role: Role.ADMIN,
    },
    update: {},
  });

  const user2 = await prisma.user.upsert({
    where: { id: 1 },
    create: {
      username: 'flahoud2',
      email: 'flahoud2@email.com',
      password: 'pass1234',
      role: Role.SUPER_MODERATOR,
    },
    update: {},
  });

  console.log({ user1, user2 });
}

// execute the main function
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // close Prisma Client at the end
    await prisma.$disconnect();
  });
