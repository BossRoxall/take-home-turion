# Generator

This is the Starter Code provided by Turion.

Reviewing the code shows that it:
1. Generates a series of binary CCSDS packets
2. Every 5th packet contains a random anomaly 
3. It sends these packets over UDP to a service listening on Port 8089.
4. Process sleeps for 1 second before running again

# Set Up

This service is a dependency for the test requirements.

This assumes the parent directory has the `.env` file with the following:

```dotenv
INGESTION_HOST="ingestion-service"
INGESTION_PORT="8089"
```

No further configuration should be required.