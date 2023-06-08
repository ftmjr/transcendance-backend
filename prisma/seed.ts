// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

// initialize Prisma Client
const prisma = new PrismaClient();

async function main() {
  const award1 = await prisma.award.upsert({
    where: { id: 1 },
    create: {
      name: 'First Game',
      description: 'Awarded for playing your first game',
      image: 'https://www.svgrepo.com/show/5528/award.svg',
    },
    update: {},
  });

  const award2 = await prisma.award.upsert({
    where: { id: 2 },
    create: {
      name: 'First Win',
      description: 'Awarded for winning your first game',
      image: 'https://www.svgrepo.com/show/118222/award.svg',
    },
    update: {},
  });

  console.log({ award1, award2 });
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
