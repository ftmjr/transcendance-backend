#!/bin/sh

# Execute Prisma migrations
npx prisma migrate deploy

# Execute Prisma seed
npx prisma db seed

echo "Executed Prisma deploy, initializing server..."

exec "$@"
