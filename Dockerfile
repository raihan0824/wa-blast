# Stage 1: Install dependencies and build
FROM node:20-alpine AS build

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json tsconfig.base.json ./

# Copy workspace package.json files
COPY server/package.json server/
COPY client/package.json client/

# Install all dependencies
RUN npm ci

# Copy source code
COPY server/ server/
COPY client/ client/

# Build client (React) and server (TypeScript)
RUN npm run build -w client && npm run build -w server

# Stage 2: Production runtime
FROM node:20-alpine

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./
COPY server/package.json server/

# Install production dependencies only for server
RUN npm ci --workspace=server --omit=dev

# Copy built server
COPY --from=build /app/server/dist server/dist

# Copy built client
COPY --from=build /app/client/dist client/dist

# Data directory for SQLite database (mount as volume for persistence)
RUN mkdir -p /app/data
VOLUME /app/data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
