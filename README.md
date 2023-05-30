<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Prisma
https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases-typescript-postgresql
```bash
# Launch web database visualizer
yarn prisma studio 
```

## Developement workflow

### How to create a new feature
```bash
# start from develop branch
$ git checkout develop

# Create a new branch
$ git checkout -b branch-name

# Commit your changes
$ git commit -am 'Add some feature'

# Push to the branch
$ git push origin branch-name

# Create a new Pull Request
```

### How to develop

Start the docker container  with the database, it will be open on 5432 port
```bash
  docker-compose -f path_to/docker-compose.yml -p transcendance up -d db
```

Start the backend
```bash
  yarn start:dev
```
