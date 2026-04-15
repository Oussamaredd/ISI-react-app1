# syntax=docker/dockerfile:1

# Monorepo build image for the API service.
# Uses the root workspace lockfile and builds database + API packages.

ARG APP_VERSION=0.0.0
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

FROM node:22-bookworm-slim AS deps
WORKDIR /workspace

COPY package*.json ./
COPY app/package*.json ./app/
COPY api/package*.json ./api/
COPY database/package*.json ./database/
COPY infrastructure/package*.json ./infrastructure/
COPY mobile/package*.json ./mobile/
COPY infrastructure/scripts/install-git-hooks.mjs ./infrastructure/scripts/

RUN npm ci

FROM node:22-bookworm-slim AS prod-deps
WORKDIR /workspace

COPY package*.json ./
COPY app/package*.json ./app/
COPY api/package*.json ./api/
COPY database/package*.json ./database/
COPY infrastructure/package*.json ./infrastructure/
COPY mobile/package*.json ./mobile/
COPY infrastructure/scripts/install-git-hooks.mjs ./infrastructure/scripts/

RUN node -e "const fs=require('fs'); const packageJson=JSON.parse(fs.readFileSync('package.json','utf8')); packageJson.workspaces=['api','database','infrastructure']; fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2)+'\n');" \
    && npm ci --omit=dev --workspace=ecotrack-api --workspace=ecotrack-database --include-workspace-root=false --install-strategy=nested \
    && npm install --omit=dev --no-save multer@2.1.1 socket.io-parser@4.2.6 tar@7.5.11 \
    && rm -rf /workspace/node_modules/@nestjs/platform-express/node_modules/multer \
              /workspace/node_modules/socket.io/node_modules/socket.io-parser \
              /workspace/node_modules/socket.io-client/node_modules/socket.io-parser

FROM deps AS builder
WORKDIR /workspace
COPY . .

RUN npm run build --workspace=ecotrack-database
RUN npm run build --workspace=ecotrack-api

FROM node:22-bookworm-slim AS runtime
ARG APP_VERSION
ARG VCS_REF
ARG BUILD_DATE
WORKDIR /workspace
ENV NODE_ENV=production
LABEL org.opencontainers.image.title="EcoTrack API" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

COPY --from=prod-deps --chown=node:node /workspace/node_modules ./node_modules
COPY --from=builder --chown=node:node /workspace/package*.json ./
COPY --from=builder --chown=node:node /workspace/api ./api
COPY --from=builder --chown=node:node /workspace/database ./database
COPY --from=builder --chown=node:node /workspace/infrastructure ./infrastructure

RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/lib/node_modules/corepack \
           /opt/yarn-v* \
    && rm -f /usr/local/bin/npm \
              /usr/local/bin/npx \
              /usr/local/bin/corepack \
              /usr/local/bin/yarn \
              /usr/local/bin/yarnpkg

WORKDIR /workspace/api
USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health/ready').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
