#!/bin/sh

# Execute Prisma migrations
npx prisma migrate deploy

# Execute Prisma seed
npx prisma db seed

# Set uploads folder permissions
chmod -R 777 /app/uploads

# Check the BUILD_TYPE and execute appropriate command
if [ "$BUILD_TYPE" = "production" ]; then
  echo "Build code..."
  yarn build
  echo "Running production server..."
  exec yarn start
else
  echo "Running development server..."
  exec yarn start:dev
fi
