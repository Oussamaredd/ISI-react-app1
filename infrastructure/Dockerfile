# syntax=docker/dockerfile:1

# Monorepo build image for the API service.
# Uses the root workspace lockfile and builds database + API packages.

FROM node:20-alpine AS deps
WORKDIR /workspace

COPY package*.json ./
COPY app/package*.json ./app/
COPY api/package*.json ./api/
COPY database/package*.json ./database/
COPY infrastructure/package*.json ./infrastructure/

RUN npm ci

FROM deps AS builder
WORKDIR /workspace
COPY . .

RUN npm run build --workspace=react-app1-database
RUN npm run build --workspace=react-app1-api

FROM node:20-alpine AS runtime
WORKDIR /workspace
ENV NODE_ENV=production

RUN apk add --no-cache curl

COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=builder /workspace/package*.json ./
COPY --from=builder /workspace/api ./api
COPY --from=builder /workspace/database ./database
COPY --from=builder /workspace/infrastructure ./infrastructure

WORKDIR /workspace/api
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3001/api/health || exit 1

CMD ["node", "dist/main.js"]
