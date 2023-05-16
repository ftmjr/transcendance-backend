FROM node:18-alpine

WORKDIR /app

COPY package*.json yarn.lock ./

RUN yarn install; yarn prisma migrate dev --name init

VOLUME /app

EXPOSE 3001

CMD ["yarn", "start:dev"]
