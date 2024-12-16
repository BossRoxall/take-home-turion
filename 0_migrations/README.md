# Migrations

This service is intended to satisfy the "Database Migrations Optional Requirement".

# Set Up

This assumes the parent directory has the `.env` file with the following:

```dotenv
POSTGRES_DB="telemetry"
POSTGRES_HOSTNAME="timescaledb"
POSTGRES_PASSWORD="nimda"
POSTGRES_PORT="5432"
POSTGRES_USER="admin"
```

No further configuration should be required.