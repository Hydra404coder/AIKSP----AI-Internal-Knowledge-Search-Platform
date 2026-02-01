# =============================================================================
# BACKEND DOCKERFILE - PRODUCTION BUILD FOR NODE.JS API
# =============================================================================
#
# WHAT IS DOCKER?
# Docker creates isolated containers that package your app with all its 
# dependencies. Think of it as a "portable computer" that runs anywhere.
#
# WHY DOCKER FOR DEPLOYMENT?
# - "Works on my machine" → Works EVERYWHERE
# - Consistent environment across dev/staging/production
# - Easy scaling with container orchestration (Kubernetes)
# - Quick deployments and rollbacks
#
# DOCKERFILE EXPLAINED:
# A Dockerfile is a recipe for building a Docker image.
# Each instruction creates a "layer" in the final image.
#
# =============================================================================

# -----------------------------------------------------------------------------
# STAGE 1: Build Stage
# -----------------------------------------------------------------------------
# We use multi-stage builds to keep the final image small.
# This stage installs all dependencies including devDependencies.

# Start from official Node.js image (Alpine = lightweight Linux)
# "node:20-alpine" means Node.js v20 on Alpine Linux (~5MB vs ~900MB for full)
FROM node:20-alpine AS builder

# Set working directory inside container
# All subsequent commands run from this directory
WORKDIR /app

# Copy package files first (for better caching)
# Docker caches layers - if package.json hasn't changed, npm install is skipped
COPY package*.json ./

# Install ALL dependencies (including devDependencies)
# We need devDependencies for any build steps
RUN npm ci

# Copy source code
# .dockerignore prevents copying node_modules, .git, etc.
COPY . .

# -----------------------------------------------------------------------------
# STAGE 2: Production Stage
# -----------------------------------------------------------------------------
# This creates the final, slim production image.
# We only copy what we need from the builder stage.

FROM node:20-alpine AS production

# Set NODE_ENV to production
# This optimizes Node.js and npm behavior for production
ENV NODE_ENV=production

# Create non-root user for security
# Running as root inside containers is a security risk
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies ONLY
# --omit=dev skips devDependencies
# --ignore-scripts prevents running postinstall scripts (security)
RUN npm ci --omit=dev --ignore-scripts

# Copy source code from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# Switch to non-root user
USER nodejs

# Expose port (documentation - actual port binding happens at runtime)
# This doesn't publish the port, just documents it
EXPOSE 5000

# Health check - Docker will ping this endpoint to check if app is healthy
# Used by orchestrators (Docker Compose, Kubernetes) for container management
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the application
# Use node directly, not npm, for proper signal handling
CMD ["node", "server.js"]
