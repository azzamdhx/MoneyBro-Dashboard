# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build Next.js
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy artifacts and dependencies from builder (keeps TypeScript available for next.config.ts)
COPY --from=builder /app/package*.json ./
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/next.config.* ./
COPY --from=builder --chown=nextjs:nextjs /app/postcss.config.* ./
COPY --from=builder --chown=nextjs:nextjs /app/tailwind.config.* ./

USER nextjs
EXPOSE 3000

CMD ["npm", "start"]
