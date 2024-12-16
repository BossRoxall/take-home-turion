#!/bin/bash

# Docker Healthcheck does not allow variables in the command
# Created this script to run within the container and therefore with access to the environment variables

pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"