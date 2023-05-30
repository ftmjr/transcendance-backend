#!/bin/sh

# Execute Prisma migrations
npx prisma migrate deploy

echo "Executed Prisma deploy, initializing server..."

exec "$@"