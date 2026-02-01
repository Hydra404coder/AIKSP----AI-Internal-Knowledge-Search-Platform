# =============================================================================
# FRONTEND DOCKERFILE - PRODUCTION BUILD FOR REACT APPLICATION
# =============================================================================
#
# BUILDING REACT FOR PRODUCTION:
# React apps are Single Page Applications (SPAs). In production:
# 1. Build step: Vite compiles React/JSX into static HTML/CSS/JS files
# 2. Serve step: A web server (nginx) serves these static files
#
# WHY NGINX?
# - React's dev server is NOT for production
# - nginx is fast, secure, and handles routing for SPAs
# - Handles gzip compression, caching, and more
#
# =============================================================================

# -----------------------------------------------------------------------------
# STAGE 1: Build Stage - Compile React to static files
# -----------------------------------------------------------------------------

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments - allows passing values at build time
# These become environment variables during the build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Build the React app
# This creates a 'dist' folder with static files
RUN npm run build

# -----------------------------------------------------------------------------
# STAGE 2: Production Stage - Serve with nginx
# -----------------------------------------------------------------------------

# Use nginx alpine image (tiny, ~5MB)
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage to nginx's serve directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (standard HTTP port)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx in foreground (required for Docker)
# "daemon off" prevents nginx from backgrounding itself
CMD ["nginx", "-g", "daemon off;"]
