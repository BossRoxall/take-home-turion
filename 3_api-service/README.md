# API Service

This Fastify Typescript Service was created to satisfy requirement 2 from the 
"Turion GSW Take Home" Document.

## Part 2: Telemetry API Service (Required)

Requirements

Create a REST API using Fiber/Echo (Go), FastAPI (Python), or Express/Fastify (TypeScript) that provides:
- [x] Historical telemetry queries with time range filtering
- [x] Aggregation endpoints (min, max, avg) over time periods
- [x] Current satellite status endpoint
- [x] Anomaly history endpoint

## Swagger Documentation

Swagger Documentation is available while the application is running at:

> http://127.0.0.1:3000/documentation

The schemas that comprise this documentation are the same ones that define the API validation. 

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

---

> **_ADDITIONAL:_**  
> The checklist mentioned an aggregate endpoint that wasn't indicated in the
> API Specs above. Created an additional endpoint based on bullet description

```text
GET /api/v1/telemetry/aggregate
```
Query Parameters:
- start_time (`ISO8601`)
- end_time (`ISO8601`)