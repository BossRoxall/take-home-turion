# Stage 1: Build the Go application
FROM golang:1.23-alpine AS builder

# Install required build dependencies
RUN apk add --no-cache git

# Set the working directory inside the container
WORKDIR /app

# Copy Go modules manifests first for dependency caching
COPY go.mod go.sum ./

# Download and cache dependencies
RUN go mod download

# Copy the rest of the application code
COPY . .

# Build the Go application
RUN go build -o ingestion .

# Stage 2: Create the runtime image
FROM golang:1.23-alpine

ARG INGESTION_PORT

# Add this to install netcat for the healthcheck
RUN apk add --no-cache netcat-openbsd

# Set the working directory inside the container
WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/ingestion .

# Expose the UDP port
EXPOSE $INGESTION_PORT/udp

# Command to run the application
CMD ["./ingestion"]