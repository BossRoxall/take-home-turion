# Turion GSW Take Home Project

Hello and thank you for taking the time to review my submission!

## Set Up

Ensure [Docker](https://docs.docker.com/engine/install/) is installed where 
you'd like to run this code.

Clone the Repository:

```shell
git clone git@github.com:BossRoxall/take-home-turion.git
```

If you'd like to test the alerting, create a Slack Webhook URL and add it to
the `.env` file as
```dotenv
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SERVICE/URL"
```

If not, you can view the alerts that the Ingestion Service _would_ have sent
by viewing that service's logs. For example:

```shell
2024/12/15 17:47:55 Telemetry: Received 32 bytes from 192.168.97.5:57193
2024/12/15 17:47:55 Telemetry: Decoded packet with PacketID: 2049
2024/12/15 17:47:55 failed to send anomaly detected to Slack: SLACK_WEBHOOK_URL not defined
Anomalies detected PacketID[1]
- Signal[-85.88dB < -80.00dB]
2024/12/15 17:47:55 Telemetry: Packet written to database (PacketID: 2049)
```
## Start Up

To start the project run:

```shell
docker compose up -d
```

This will command will initiate the following services:

1. Starts the Database Service: TimescaleDB (Postgres17) 
2. Once the Database Service is healthy: Runs the Migrations Service.
3. Once the Migration service completes (runs & shuts down): Starts the Ingestion Service.
4. Once the Migration Service completes (runs & shuts down): Starts the API Service
5. Once the Ingestion service is healthy: Starts the Generator Service. 
6. Once the API Service is started: Starts the Frontend Service

Once the application is running you can:
- [View the API Swagger Documentation](http://localhost:8090/documentation) with working "Try it out" support
- [Visit the Frontend Service Telemetry Dashboard](http://localhost:3000)

Once on the Dashboard, you should see data flowing to the database in real time.

---

# Performance Test

Performance Testing was done using:
- K6
- InfluxDB
- Grafana

## Ingestion Service 

This required a Go HTTP -> UDP Proxy as K6 doesn't natively support UDP requests.

Scenario:
- 120 Virtual Users
- Duration: 5 minutes

Outcome:
- No errors
- 672,898 Total Requests
- Requests per second
  - Mean: 4.34 K
  - Max: 5.45 K
- HTTP Request Duration:
  - Mean: 13.67 ms
  - Median: 3.82 ms
  - Max: 3.01s

![Performance Image](./5_performance-tests/ingestionService.5m.png)

---

# Requirements

## Part 1: Telemetry Ingestion Service (Required)

Requirements

Create a service that:

- [x] Listens for UDP packets containing spacecraft telemetry :check:
- [x] Decodes CCSDS-formatted packets according to provided structure
- [x] Validates telemetry values against defined ranges:
    - Altitude: 500-550km (normal), <400km (anomaly)
    - Battery: 70-100% (normal), <40% (anomaly)
    - Signal Strength: -60 to -40dB (normal), <-80dB (anomaly)
    - Temperature: 20.0°C to 30.0°C (normal), >35.0°C (anomaly)
- [x] Persists data to a database (Timescale or PostgreSQL preferred but not required.)
- [x] Implements an alerting mechanism for out-of-range values (Anomalies)


## Part 2: Telemetry API Service (Required)

Requirements

Create a REST API using Fiber/Echo (Go), FastAPI (Python), or Express/Fastify (TypeScript) that provides:

- [x] Historical telemetry queries with time range filtering 
- [x] Aggregation endpoints (min, max, avg) over time periods 
- [x] Current satellite status endpoint 
- [x] Anomaly history endpoint 

> **_Additional Notes/Achievements_**
> - [x] Fastify (Typescript) was selected
> - [x] Add API Validation to each route (Request and Response)
> - [x] Add Swagger/OpenAPI documentation for each route
> - [x] The Swagger Definition and the API Validation are driven by the same schema

### API Endpoints (Minimum Required) 

```text
GET /api/v1/telemetry
```

Query Parameters:
- start_time (`ISO8601`)
- end_time (`ISO8601`)

```text
GET /api/v1/telemetry/current
```

Returns latest telemetry values

```text
GET /api/v1/telemetry/anomalies
```

Query Parameters:
- start_time (`ISO8601`)
- end_time (`ISO8601`)

> **_ADDITIONAL:_**  
> The checklist mentioned an aggregate endpoint that wasn't indicated in the 
> API Specs above. Created an additional endpoint based on bullet description

```text
GET /api/v1/telemetry/aggregate
```
Query Parameters:
- start_time (`ISO8601`)
- end_time (`ISO8601`)

## Part 3: Front End Implementation

> **_NOTE:_**  
> This section omitted the "Required" tag in the documents provided.  
> I have included it in my submission, though without the "Anomaly 
> Notifications" objective.

Create a telemetry dashboard that:
- [x] Real-time updates: Display the most recent telemetry values in real time.
- [x] Historical graphs or tables: Show historical telemetry data.
- [ ] Anomaly notifications: Provide real-time anomaly notifications.

### Technical Requirements

- Use React (You can use another front end tool, if you do not understand react)
for the frontend.

---

## Emphasis

Backend-Focused Optional Requirements
- [x] Database migrations: Implement migrations for storing telemetry data and
managing schema evolution (setting up the system and having one migration is
acceptable).
- [ ] Observability: Use OpenTelemetry to instrument backend APIs and pipelines, with
optional visualization using Grafana Tempo, Loki, Prometheus/Mimir.
- [ ] Integration test: Write integration tests to ensure the API correctly serves
telemetry data and handles edge cases (e.g., real-time updates, data gaps).
- [ ] Performance testing: Include performance benchmarks for real-time update
pipelines and historical queries.

## Bonus Points

- [x] Docker Compose: Provide a working Docker Compose file for local development
with all dependencies (frontend, backend, database, observability tools).

> My docker-compose implementation supports:
> - Local Development and Production Builds
> - Container start up sequencing
> - Database Migrations  

- [ ] Comprehensive tests: Include unit tests, integration tests, and end-to-end
tests.
- [ ] Performance testing results: Provide evidence of load testing or benchmarking
(e.g., using tools like JMeter, k6, or Locust).

---

## Deviations from Convention

Normally credentials should be centralized in a protected service like Vault, 
but for the sake of self-sufficiency, I have elected to use a centralized 
`.env` file so the reviewers can easily view and modify these values.

## Security Notes

Normally `.env` files would be excluded from the repository, but as this is a 
contrived test and those files are required to run the application, they have 
been included for your convenience.