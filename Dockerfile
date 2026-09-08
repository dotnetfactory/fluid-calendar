# Base stage for both development and production
FROM node:22-alpine3.19 AS base
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install netcat
RUN apk add --no-cache netcat-openbsd

# Development stage
FROM base AS development
WORKDIR /app
ENV NODE_ENV=development
COPY . .
COPY package*.json ./
RUN npm ci --legacy-peer-deps
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "run", "dev"]

# Production builder stage
FROM base AS builder
WORKDIR /app
COPY . .
COPY package*.json ./
RUN npm ci --include=dev --legacy-peer-deps
RUN npm run prisma:generate
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# Keep the locked CLI and its downloaded engines available without runtime downloads.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"] 
