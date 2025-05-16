# Multi-stage build for JsonMapper

# Stage 1: Build backend
FROM node:18-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/tsconfig.json ./
COPY frontend/vite.config.ts ./
COPY frontend/index.html ./
COPY frontend/public ./public
COPY frontend/src ./src
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built backend
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend
COPY --from=frontend-builder /app/dist ./frontend/dist

# Copy necessary files
COPY templates ./templates

# Create data directory
RUN mkdir -p data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "dist/index.js"]
