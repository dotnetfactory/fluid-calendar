#!/bin/sh

# Extract database connection details from DATABASE_URL
PG_HOST=$(echo "$DATABASE_URL" | sed -E 's#.*@([^:/]+).*#\1#')
PG_PORT=$(echo "$DATABASE_URL" | sed -E 's/.*:([0-9]*)\/.*/\1/')
PG_PORT=${PG_PORT:-5432}

# Wait for database to be ready
echo "Waiting for database to be ready..."
while ! nc -z $PG_HOST $PG_PORT; do
  sleep 1
done
echo "Database is ready!"

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "Starting the application..."
exec "$@" 