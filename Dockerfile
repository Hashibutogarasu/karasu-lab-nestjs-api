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

# Generate Prisma client before building the application
RUN npx prisma generate

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates

# Install pnpm
RUN npm install -g pnpm

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Generate Prisma client for production
RUN npx prisma generate

# Expose the application port
EXPOSE 3000

# Define the command to run the application
CMD ["node", "dist/main.js"]