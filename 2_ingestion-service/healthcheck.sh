#!/bin/sh

# Send a UDP message and check for the expected response
echo "healthcheck" | nc -u -w 3 127.0.0.1 $HEALTHCHECK_PORT | grep -q "healthy"

if [ $? -eq 0 ]; then
  echo "Healthcheck succeeded"
  exit 0
else
  echo "Healthcheck failed"
  exit 1
fi