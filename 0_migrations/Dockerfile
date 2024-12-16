# Use the golang image as the base for running migrations
FROM golang:1.23-alpine

# Install required tools
RUN apk add --no-cache bash curl

# Install golang-migrate
RUN curl -L https://github.com/golang-migrate/migrate/releases/download/v4.15.2/migrate.linux-amd64.tar.gz | tar xvz && \
    mv migrate /usr/local/bin/

# Set the working directory
WORKDIR /app

# Copy migrations into the container
COPY migrations /app/migrations

# Entry point for running migrations
ENTRYPOINT ["migrate"]