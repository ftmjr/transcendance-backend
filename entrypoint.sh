#!/bin/sh

# Execute Prisma migrations
npx prisma migrate deploy

# Execute Prisma seed
npx prisma db seed

# set uploads folder permissions
chmod -R 777 /app/uploads

echo "Executed Prisma deploy, initializing server..."

exec "$@"
