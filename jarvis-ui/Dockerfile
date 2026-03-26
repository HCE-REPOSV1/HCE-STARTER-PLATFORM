# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder
ARG VERDACCIO_URL=http://host.docker.internal:10100
WORKDIR /app
COPY package*.json .npmrc* ./
RUN sed -i "s|http://localhost:10100|${VERDACCIO_URL}|g" .npmrc 2>/dev/null || true \
 && sed -i "s|http://localhost:4873|${VERDACCIO_URL}|g; s|http://localhost:10100|${VERDACCIO_URL}|g" package-lock.json 2>/dev/null || true
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production (nginx) ──────────────────────────────
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
