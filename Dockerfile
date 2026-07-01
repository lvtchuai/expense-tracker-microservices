# Shared multi-stage build for both NestJS apps.
# Pick the app with: --build-arg APP=auth-service | transaction-service
ARG NODE_VERSION=22-alpine

# ---- deps: install everything (incl. dev) for the build ----
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build: compile the selected app ----
FROM node:${NODE_VERSION} AS build
ARG APP
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build ${APP}

# ---- prod-deps: production-only node_modules ----
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- runtime: slim, non-root ----
FROM node:${NODE_VERSION} AS runtime
ARG APP
ENV NODE_ENV=production
ENV APP_MAIN=dist/apps/${APP}/apps/${APP}/src/main
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node
CMD ["sh", "-c", "node $APP_MAIN"]
