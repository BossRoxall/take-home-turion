# Stage 1: Build the Go application
FROM golang:1.23-alpine AS builder

# Install required build dependencies
RUN apk add --no-cache git

# Set the working directory inside the container
WORKDIR /app

# Copy Go modules manifests first for dependency caching
#COPY go.mod go.sum ./
COPY go.mod ./

# Download and cache dependencies
RUN go mod download

# Copy the rest of the application code
COPY . .

# Build the Go application
RUN go build -o http-to-udp-proxy .

# Stage 2: Create the runtime image
FROM golang:1.23-alpine

ARG PROXY_PORT

# Add this to install netcat for the healthcheck
RUN apk add --no-cache netcat-openbsd

# Set the working directory inside the container
WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /app/http-to-udp-proxy .

# Expose the UDP port
EXPOSE $PROXY_PORT/udp

# Command to run the application
CMD ["./http-to-udp-proxy"]