#!/bin/sh

# Execute Prisma migrations
npx prisma migrate deploy

# Execute Prisma generate
npx prisma generate

# Execute Prisma seed
npx prisma db seed

VOLUME /app/uploads

echo "Executed Prisma deploy, initializing server..."

exec "$@"
