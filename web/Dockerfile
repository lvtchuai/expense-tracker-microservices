# Next.js standalone production image.
ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public API URLs are baked at build time; override via build args if needed.
ARG NEXT_PUBLIC_AUTH_URL
ARG NEXT_PUBLIC_TRANSACTION_URL
ARG NEXT_PUBLIC_REPORT_URL
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_TRANSACTION_URL=$NEXT_PUBLIC_TRANSACTION_URL
ENV NEXT_PUBLIC_REPORT_URL=$NEXT_PUBLIC_REPORT_URL
RUN npm run build

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app
# standalone output bundles only what's needed.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
