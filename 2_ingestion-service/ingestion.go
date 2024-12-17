package main

import (
	"2_ingestion-service/utils"
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"log"
	"net"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool" // Correct pgxpool import
)

// CCSDSPrimaryHeader CCSDS Primary Header (6 bytes)
type CCSDSPrimaryHeader struct {
	PacketID      uint16 // Version(3 bits), Type(1 bit), SecHdrFlag(1 bit), APID(11 bits)
	PacketSeqCtrl uint16 // SeqFlags(2 bits), SeqCount(14 bits)
	PacketLength  uint16 // Total packet length minus 7
}

// CCSDSSecondaryHeader CCSDS Secondary Header (10 bytes)
type CCSDSSecondaryHeader struct {
	Timestamp   uint64 // Unix timestamp
	SubsystemID uint16 // Identifies the subsystem (e.g., power, thermal)
}

// TelemetryPayload Telemetry Payload
type TelemetryPayload struct {
	Temperature float32 // Temperature in Celsius
	Battery     float32 // Battery percentage
	Altitude    float32 // Altitude in kilometers
	Signal      float32 // Signal strength in dB
}

// FullTelemetryPacket combines all components of the telemetry packet
type FullTelemetryPacket struct {
	PrimaryHeader   CCSDSPrimaryHeader
	SecondaryHeader CCSDSSecondaryHeader
	Payload         TelemetryPayload
}

func main() {
	// Start health check server in a separate goroutine to keep primary thread clear
	go StartHealthCheckServer()

	// Start Telemetry server
	StartTelemetryServer()
}

func StartTelemetryServer() {
	// Create connection pool
	pool, err := pgxpool.New(context.Background(), getDatabaseConnectionString())
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()
	log.Println("Connected to TimescaleDB")

	ingestionPort, err := getAppPortFromEnv("INGESTION_PORT")
	if err != nil {
		log.Fatalf("Failed to extract ingestion port from ENV: %v", err)
	}

	// Start listening for UDP packets
	addr := net.UDPAddr{
		Port: ingestionPort,
		IP:   net.ParseIP("0.0.0.0"),
	}
	conn, err := net.ListenUDP("udp", &addr)
	if err != nil {
		log.Fatalf("Failed to start UDP listener: %v", err)
	}
	defer handleCloseConnection(conn)

	log.Println("Listening for Telemetry packets on port", addr.Port)

	// Process incoming packets
	buffer := make([]byte, 2048)
	for {
		n, remoteAddr, err := conn.ReadFromUDP(buffer)
		if err != nil {
			log.Printf("Error reading packet: %v", err)
			continue
		}

		log.Printf("Telemetry: Received %d bytes from %v", n, remoteAddr)

		packet := buffer[:n]

		// Decode CCSDS Packet
		data, err := DecodeCCSDSPacket(packet)
		if err != nil {
			log.Printf("Telemetry: Failed to decode packet: %v", err)
			continue
		}

		log.Printf("Telemetry: Decoded packet with PacketID: %d", data.PrimaryHeader.PacketID)

		// TODO: this would probably be better as a separate service to keep the ingestion optimized
		go checkForAnomalies(data, packet)

		// Write packet to TimescaleDB
		err = WriteToTimescaleDB(pool, data, packet)
		if err != nil {
			log.Fatalf("Telemetry: Failed to write packet to database: %v", err)
		}

		log.Printf("Telemetry: Packet written to database (PacketID: %d)", data.PrimaryHeader.PacketID)
	}
}

// StartHealthCheckServer starts a UDP listener to respond to health check pings
func StartHealthCheckServer() {
	healthCheckPort, err := getAppPortFromEnv("HEALTHCHECK_PORT")
	if err != nil {
		log.Fatalf("Failed to extract healthcheck port from ENV: %v", err)
	}

	healthCheckAddress := net.UDPAddr{
		Port: healthCheckPort,
		IP:   net.ParseIP("0.0.0.0"),
	}

	conn, err := net.ListenUDP("udp", &healthCheckAddress)
	if err != nil {
		log.Fatalf("Failed to start health check server: %v", err)
	}
	defer handleCloseConnection(conn)

	log.Println("Listening for Healthcheck packets on port", healthCheckAddress.Port)

	buffer := make([]byte, 1024)
	for {
		n, remoteAddr, err := conn.ReadFromUDP(buffer)
		if err != nil {
			log.Printf("Healthcheck: Error reading health check request: %v", err)
			continue
		}

		message := strings.TrimSpace(string(buffer[:n]))
		if message == "healthcheck" {
			log.Printf("Healthcheck: Valid message => Responding to UDP call")
			_, err := conn.WriteToUDP([]byte("healthy"), remoteAddr)
			if err != nil {
				log.Printf("Healthcheck: Error responding to health check: %v", err)
			} else {
				continue
			}
		}

		log.Printf("Healthcheck: Failed to respond to Healthcheck message %s", message)
	}
}

func getAppPortFromEnv(portVariable string) (int, error) {
	// Read environment variables
	appPort := os.Getenv(portVariable)

	if appPort == "" {
		return 0, fmt.Errorf("environment variable %s not set", portVariable)
	}

	// Convert the port string to an integer
	intPort, err := strconv.Atoi(appPort)
	if err != nil {
		return 0, fmt.Errorf("error converting %s to integer: %v", portVariable, err)
	}
	log.Printf("Extracted Port %s[%d] from environment\n", portVariable, intPort)

	return intPort, nil
}

func getDatabaseConnectionString() string {
	tsDatabase := os.Getenv("POSTGRES_DB")
	tsHostname := os.Getenv("POSTGRES_HOSTNAME")
	tsPassword := os.Getenv("POSTGRES_PASSWORD")
	tsPort := os.Getenv("POSTGRES_PORT")
	tsUsername := os.Getenv("POSTGRES_USER")

	// Validate environment variables
	if tsUsername == "" || tsPassword == "" || tsHostname == "" || tsPort == "" || tsDatabase == "" {
		log.Fatal("Missing required environment variables: POSTGRES_DB, POSTGRES_HOSTNAME, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_USER")
	}

	// Build DSN (Data Source Name)
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		tsUsername, tsPassword, tsHostname, tsPort, tsDatabase)
}

func handleCloseConnection(conn *net.UDPConn) {
	err := conn.Close()
	if err != nil {
		log.Fatalf("Failed to close Postgres connection: %v", err)
	}
}

// DecodeCCSDSPacket decodes a full CCSDS packet with primary/secondary headers and telemetry payload
func DecodeCCSDSPacket(packet []byte) (*FullTelemetryPacket, error) {
	if len(packet) < 20 {
		return nil, fmt.Errorf("packet too short, minimum length is 20 bytes")
	}

	reader := bytes.NewReader(packet)

	// Decode Primary Header
	var primaryHeader CCSDSPrimaryHeader
	err := binary.Read(reader, binary.BigEndian, &primaryHeader)
	if err != nil {
		return nil, fmt.Errorf("failed to decode primary header: %v", err)
	}

	// Decode Secondary Header
	var secondaryHeader CCSDSSecondaryHeader
	err = binary.Read(reader, binary.BigEndian, &secondaryHeader)
	if err != nil {
		return nil, fmt.Errorf("failed to decode secondary header: %v", err)
	}

	// Decode Telemetry Payload
	var payload TelemetryPayload
	err = binary.Read(reader, binary.BigEndian, &payload)
	if err != nil {
		return nil, fmt.Errorf("failed to decode telemetry payload: %v", err)
	}

	// Combine all components into a FullTelemetryPacket
	fullPacket := &FullTelemetryPacket{
		PrimaryHeader:   primaryHeader,
		SecondaryHeader: secondaryHeader,
		Payload:         payload,
	}

	return fullPacket, nil
}

// WriteToTimescaleDB writes packet data to TimescaleDB
func WriteToTimescaleDB(pool *pgxpool.Pool, packet *FullTelemetryPacket, rawPacket []byte) error {
	// Impose a timeout to ensure open threads don't accumulate
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		INSERT INTO ccsds_packets (
			apid, seq_flags, seq_count, timestamp, subsystem_id,
			temperature, battery, altitude, signal, raw_packet
		) VALUES (
			$1, $2, $3, to_timestamp($4), $5, $6, $7, $8, $9, $10
		)
	`

	// Execute the query
	_, err := pool.Exec(ctx, query,
		packet.PrimaryHeader.PacketID&0x07FF,          // APID (last 11 bits of PacketID)
		(packet.PrimaryHeader.PacketSeqCtrl>>14)&0x03, // SeqFlags (first 2 bits)
		packet.PrimaryHeader.PacketSeqCtrl&0x3FFF,     // SeqCount (last 14 bits)
		packet.SecondaryHeader.Timestamp,              // Timestamp
		packet.SecondaryHeader.SubsystemID,            // Subsystem ID
		packet.Payload.Temperature,                    // Temperature
		packet.Payload.Battery,                        // Battery
		packet.Payload.Altitude,                       // Altitude
		packet.Payload.Signal,                         // Signal
		rawPacket,                                     // Raw packet
	)

	if err != nil {
		// TODO: Preserve payload for investigation: Local file? Cloud storage? Queue?
		return fmt.Errorf("failed to write packet to database: %w", err)
	}

	return nil
}

const altitudeThresholdKm float32 = 400
const batteryThresholdPercent float32 = 40
const signalThresholdDecibels float32 = -80
const temperatureThresholdCelsius float32 = 35.0

/*
*
This process should trigger a notification: Arbitrarily selected Slack message
  - Altitude: 500-550km (normal), <400km (anomaly)
  - Battery: 70-100% (normal), <40% (anomaly)
  - Signal Strength: -60 to -40dB (normal), <-80dB (anomaly)
  - Temperature: 20.0°C to 30.0°C (normal), >35.0°C (anomaly)
*/
func checkForAnomalies(packet *FullTelemetryPacket, rawPacket []byte) {
	anomalies := make(map[string]string)

	if packet.Payload.Altitude < altitudeThresholdKm {
		anomalies["Altitude"] = fmt.Sprintf("%.2fkm < %.2fkm", packet.Payload.Altitude, altitudeThresholdKm)
	}
	if packet.Payload.Battery < batteryThresholdPercent {
		anomalies["Battery"] = fmt.Sprintf("%.2f%% < %.2f%%", packet.Payload.Battery, batteryThresholdPercent)
	}
	if packet.Payload.Signal < signalThresholdDecibels {
		anomalies["Signal"] = fmt.Sprintf("%.2fdB < %.2fdB", packet.Payload.Signal, signalThresholdDecibels)
	}
	if packet.Payload.Temperature > temperatureThresholdCelsius {
		anomalies["Temperature"] = fmt.Sprintf("%.2f°C < %.2f°C", packet.Payload.Temperature, temperatureThresholdCelsius)
	}

	// At least 1 anomaly detected! Send an alert
	if len(anomalies) > 0 {
		message := fmt.Sprintf("Anomalies detected PacketID[%d]", packet.PrimaryHeader.PacketID&0x07FF)
		for anomalyType, anomalyMessage := range anomalies {
			message += fmt.Sprintf("\n- %s[%s]", anomalyType, anomalyMessage)
		}

		fmt.Println(message)
		err := utils.SendSlackNotification(message)
		if err != nil {
			log.Printf("failed to send anomaly detected to Slack: %v", err)
		}
	}
}
