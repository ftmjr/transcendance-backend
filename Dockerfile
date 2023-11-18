FROM node:20-alpine

WORKDIR /app

COPY package*.json yarn.lock ./

#copy prisma folder
COPY prisma .

# set prisma migration and sync with database
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

RUN yarn install

VOLUME /app

EXPOSE 3001

ENTRYPOINT ["/app/entrypoint.sh"]

CMD ["yarn", "start:dev"]
