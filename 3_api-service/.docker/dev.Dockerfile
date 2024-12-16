# dev.Dockerfile to enable quick edits => Hot Reloading of source
FROM node:22-alpine AS build

WORKDIR /app/tmp

# Copy in assets needed for dependency installation
COPY ../package*.json ./

# Install dependencies
RUN npm ci

COPY .. .

FROM node:22-alpine AS api

# Do not use root to run the app to avoid privilege escalation, container escape, etc.
USER node

ARG PORT

WORKDIR /app

COPY --from=build --chown=node:node /app/tmp /app

# Node Application Build - relies on .dockerignore to filter
CMD [ "npm", "run", "dev" ]
EXPOSE $PORT
