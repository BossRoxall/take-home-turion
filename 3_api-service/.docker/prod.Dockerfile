FROM node:22-alpine AS base

# dev.Dockerfile that runs the compiled typescript
# Install dependencies only when needed
FROM base AS deps

WORKDIR /app

# Install dependencies
COPY ../package*.json ../.npmrc* ./

RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npm run build:ts

FROM node:22-alpine AS api

# Do not use root to run the app to avoid privilege escalation, container escape, etc.
USER node

WORKDIR /app

COPY --from=builder --chown=node:node /app /app

ARG PORT

CMD ["npm", "start"]

EXPOSE $PORT
