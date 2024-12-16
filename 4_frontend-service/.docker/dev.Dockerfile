FROM node:22-alpine AS build

WORKDIR /app/tmp

# Copy in assets needed for dependency installation
COPY ../package*.json ./

RUN npm ci

COPY . .

FROM node:22-alpine AS api

# Do not use root to run the app to avoid privilege escalation, container escape, etc.
USER node

WORKDIR /app

COPY --from=build --chown=node:node /app/tmp /app

CMD ["npm", "run", "dev"]