# syntax=docker/dockerfile:1

# Step 1: Build React app from the monorepo root so app scripts can access
# shared workspace dependencies and infrastructure preload helpers.
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

FROM deps AS build
ARG APP_VERSION
WORKDIR /workspace
COPY . .

WORKDIR /workspace/app
# Ensure Docker builds are not polluted by host-only frontend env files
# (for example app/.env.local with Vite dev port 5173).
ENV VITE_RELEASE_VERSION=${APP_VERSION}
RUN rm -f .env.local .env.*.local && npm run build

# Step 2: Serve app with Nginx
FROM nginx:alpine
ARG APP_VERSION
ARG VCS_REF
ARG BUILD_DATE
LABEL org.opencontainers.image.title="EcoTrack App" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"
COPY --from=build /workspace/app/dist /usr/share/nginx/html
COPY app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
