FROM node:18-alpine

RUN npm install -g yarn

WORKDIR /app

VOLUME . /app

#COPY package.json yarn.lock ./

#RUN yarn install

EXPOSE 9000

# CMD ["yarn", "start"]