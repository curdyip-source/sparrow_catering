FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

# Порт задаётся через FRONTEND_PORT в .env (см. scripts/ports.sh)
