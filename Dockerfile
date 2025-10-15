FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install

# Copy the rest of the application
COPY . .

# If prisma folder exists, generate client (no-op otherwise)
RUN if [ -d prisma ]; then npx prisma generate; else echo "no prisma dir"; fi

# Build the application
RUN pnpm run build

# Ensure build produced output
RUN if [ ! -d ./dist ]; then echo "Build failed: ./dist not found" >&2; exit 1; fi

# Production stage
FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Copy only what's needed from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Fail early if dist missing in final image
RUN [ -d ./dist ] || (echo "Missing ./dist in final image" >&2; exit 1)

# If prisma exists, generate client for production
RUN if [ -d prisma ]; then npx prisma generate; else echo "no prisma dir"; fi

# Expose the application port
EXPOSE 3000

# Define the command to run the application
CMD ["node", "dist/src/main.js"]