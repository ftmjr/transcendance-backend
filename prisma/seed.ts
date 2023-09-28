import { faker } from '@faker-js/faker';
import * as argon from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const awardPromises = [
      prisma.award.upsert({
        where: { id: 1 },
        update: {},
        create: {
          name: 'Premier but',
          description: 'Tu as mis ton premier but, bravo !',
          image: 'https://localhost/api/uploads/awards/revolver.png',
        },
      }),
      prisma.award.upsert({
        where: { id: 2 },
        update: {},
        create: {
          name: 'Premier defis gagné',
          description: 'Félicitation pour ton premier défi gagné !',
          image: 'https://localhost/api/uploads/awards/boxing-glove.png',
        },
      }),
      prisma.award.upsert({
        where: { id: 3 },
        update: {},
        create: {
          name: 'The Winner',
          description: 'Tu as gagné tes 5 premiers match, bravo !',
          image: 'https://localhost/api/uploads/awards/swords-power.png',
        },
      }),
    ];
    await Promise.all(awardPromises);

    const usersPassword = await argon.hash('NotSecure1234');
    const userPromises = Array(15)
      .fill(null)
      .map((val, index) => {
        return prisma.user.upsert({
          where: { id: index + 1 },
          update: {},
          create: {
            username: faker.internet.userName(),
            email: faker.internet.email(),
            password: usersPassword,
            profile: {
              create: {
                name: faker.person.firstName(),
                lastname: faker.person.lastName(),
                avatar: faker.image.avatar(),
                bio: faker.person.bio(),
              },
            },
          },
        });
      });
    const users = await Promise.all(userPromises);

    const chatRoomPromises = [
      prisma.chatRoom.upsert({
        where: { id: 1 },
        update: {},
        create: {
          name: 'Les pongistes',
          type: 'PUBLIC',
          avatar: faker.image.avatar(),
          members: {
            createMany: {
              data: [
                { memberId: 1, role: 'OWNER' },
                { memberId: 2, role: 'ADMIN' },
                { memberId: 3, role: 'ADMIN' },
                { memberId: 4, role: 'USER' },
                { memberId: 5, role: 'USER' },
                { memberId: 6, role: 'USER' },
                { memberId: 7, role: 'BAN' },
              ],
            },
          },
        },
      }),
      prisma.chatRoom.upsert({
        where: { id: 2 },
        update: {},
        create: {
          name: 'Les footballeurs',
          type: 'PUBLIC',
          avatar: faker.image.avatar(),
          members: {
            createMany: {
              data: [
                { memberId: 3, role: 'OWNER' },
                { memberId: 6, role: 'USER' },
                { memberId: 1, role: 'USER' },
                { memberId: 9, role: 'USER' },
                { memberId: 8, role: 'USER' },
                { memberId: 10, role: 'USER' },
              ],
            },
          },
        },
      }),
    ];
    await Promise.all(chatRoomPromises);

    const contactPromises = users.map((user, index) => {
      // Choose 2 random other users to add as contacts
      const contactIndices = [];
      while (contactIndices.length < 2) {
        const randomIndex = faker.number.int({
          min: 0,
          max: users.length - 1,
        });
        if (randomIndex !== index && !contactIndices.includes(randomIndex)) {
          contactIndices.push(randomIndex);
        }
      }
      // Create contact records
      return contactIndices.map((i) => {
        return prisma.contact.create({
          data: {
            userId: user.id,
            contactId: users[i].id,
          },
        });
      });
    });
    await Promise.all(contactPromises);
  } catch (e) {
    console.error('Error seeding the database:', e);
  } finally {
    console.log('Seeding finished.');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
