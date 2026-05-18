# Dockerfile — {{SERVICE_NAME}}
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nestjs && adduser -S nestjs -G nestjs
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE ${PORT:-3000} ${SSL_PORT:-3443}
USER nestjs
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:${PORT:-3000}/health || exit 1
CMD ["node", "dist/main"]
