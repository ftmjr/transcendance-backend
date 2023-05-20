FROM node:18-alpine

WORKDIR /app

COPY package*.json yarn.lock ./
COPY prisma .

RUN yarn install
# If prisma dont work run in docker : yarn prisma migrate dev --name init

VOLUME /app

EXPOSE 3001

CMD ["yarn", "start:dev"]
