# Build stage
FROM node:20-alpine3.19 AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci --legacy-peer-deps
RUN npx prisma generate

# Copy source
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine3.19 AS runner
# Install netcat and jq for JSON manipulation
RUN apk add --no-cache netcat-openbsd jq python3 make g++

WORKDIR /app

# Install production dependencies
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production --legacy-peer-deps --ignore-scripts
# Rebuild bcrypt explicitly
RUN cd node_modules/bcrypt && npm rebuild bcrypt --build-from-source

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create and switch to non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
# Set ownership of the application files to nextjs user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Start the application
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"] 