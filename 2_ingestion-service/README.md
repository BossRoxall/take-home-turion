# Ingestion Service

This Go Service was created to satisfy requirement 1 from the "Turion GSW Take 
Home" Document.

## Part 1: Telemetry Ingestion Service (Required)

Requirements

Create a service that:

- [x] Listens for UDP packets containing spacecraft telemetry :check:
- [x] Decodes CCSDS-formatted packets according to provided structure 
- [x] Validates telemetry values against defined ranges:
  - Temperature: 20.0°C to 30.0°C (normal), >35.0°C (anomaly)
  - Battery: 70-100% (normal), <40% (anomaly)
  - Altitude: 500-550km (normal), <400km (anomaly)
  - Signal Strength: -60 to -40dB (normal), <-80dB (anomaly)
- [x] Persists data to a database (Timescale or PostgreSQL preferred but not required.)
- [x] Implements an alerting mechanism for out-of-range values (Anomalies)

