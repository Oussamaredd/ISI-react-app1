# syntax=docker/dockerfile:1

# Monorepo build image for the API service.
# Uses the root workspace lockfile and builds database + API packages.

ARG APP_VERSION=0.0.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

FROM node:22-alpine AS deps
WORKDIR /workspace

COPY package*.json ./
COPY app/package*.json ./app/
COPY api/package*.json ./api/
COPY database/package*.json ./database/
COPY infrastructure/package*.json ./infrastructure/
COPY mobile/package*.json ./mobile/
COPY infrastructure/scripts/install-git-hooks.mjs ./infrastructure/scripts/

RUN npm ci

FROM node:22-alpine AS prod-deps
WORKDIR /workspace

COPY package*.json ./
COPY app/package*.json ./app/
COPY api/package*.json ./api/
COPY database/package*.json ./database/
COPY infrastructure/package*.json ./infrastructure/
COPY mobile/package*.json ./mobile/
COPY infrastructure/scripts/install-git-hooks.mjs ./infrastructure/scripts/

RUN npm ci --omit=dev

FROM deps AS builder
WORKDIR /workspace
COPY . .

RUN npm run build --workspace=ecotrack-database
RUN npm run build --workspace=ecotrack-api

FROM node:22-alpine AS runtime
ARG APP_VERSION
ARG VCS_REF
ARG BUILD_DATE
WORKDIR /workspace
ENV NODE_ENV=production
LABEL org.opencontainers.image.title="EcoTrack API" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

RUN apk add --no-cache curl

COPY --from=prod-deps --chown=node:node /workspace/node_modules ./node_modules
COPY --from=builder --chown=node:node /workspace/package*.json ./
COPY --from=builder --chown=node:node /workspace/api ./api
COPY --from=builder --chown=node:node /workspace/database ./database
COPY --from=builder --chown=node:node /workspace/infrastructure ./infrastructure

WORKDIR /workspace/api
USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://localhost:3001/api/health/ready || exit 1

CMD ["node", "dist/main.js"]
