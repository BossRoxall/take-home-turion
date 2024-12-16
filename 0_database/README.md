# [TimescaleDB](https://docs.timescale.com/self-hosted/latest/install/installation-docker/)

TimescaleDB is a PostgreSQL extension for time series and demanding workloads
that ingest and query high volumes of data. You can install a TimescaleDB 
instance on any local system from a pre-built Docker container.

# Set Up

This service is a dependency for the test requirements.

This assumes the parent directory has the `.env` file with the following:

```dotenv
POSTGRES_DB="telemetry"
POSTGRES_HOSTNAME="timescaledb"
POSTGRES_PASSWORD="nimda"
POSTGRES_PORT="5432"
POSTGRES_USER="admin"
```

No further configuration should be required.

## Health Check

Docker Healthcheck does not allow variables in the command.
I created this script to run within the container and therefore with access to 
the environment variables.