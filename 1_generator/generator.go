package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"log"
	"math/rand"
	"net"
	"os"
	"strconv"
	"time"
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

const (
	APID           = 0x01
	PACKET_VERSION = 0x0
	PACKET_TYPE    = 0x0    // 0 = TM (telemetry)
	SEC_HDR_FLAG   = 0x1    // Secondary header present
	SEQ_FLAGS      = 0x3    // Standalone packet
	SUBSYSTEM_ID   = 0x0001 // Main bus telemetry
)

func main() {
	// Convert the port string to an integer
	ingestionHost := os.Getenv("INGESTION_HOST")
	ingestionPort := getAppPortFromEnv("INGESTION_PORT")
	connStr := fmt.Sprintf("%s:%d", ingestionHost, ingestionPort)
	conn, err := net.Dial("udp", connStr)
	if err != nil {
		log.Fatal(err)
	}

	// Ensure connection closes once done + handle error
	defer closeConnection(conn)

	packetCount := uint16(0)
	for {
		data := createTelemetryPacket(&packetCount)

		_, err := conn.Write(data)
		if err != nil {
			log.Printf("Error sending telemetry: %v", err)
			continue
		}

		if packetCount%5 == 0 {
			log.Printf("Sent anomalous telemetry packet #%d\n", packetCount)
		} else {
			log.Printf("Sent normal telemetry packet #%d\n", packetCount)
		}

		time.Sleep(1 * time.Second)
		packetCount++
	}
}

func getAppPortFromEnv(portVariable string) (intPort int) {
	// Read environment variables
	appPort := os.Getenv(portVariable)

	// Convert the port string to an integer
	intPort, err := strconv.Atoi(appPort)
	if err != nil {
		log.Fatalf("Error converting INGESTION_PORT to integer: %v\n", err)
	}
	log.Printf("Extracted Port %d from environment\n", intPort)

	return
}

func closeConnection(conn net.Conn) {
	err := conn.Close()
	if err != nil {
		log.Fatal(err)
	}
}

func createTelemetryPacket(seqCount *uint16) []byte {
	buf := new(bytes.Buffer)

	// Create primary header
	// PacketID: Version(3) | Type(1) | SecHdrFlag(1) | APID(11)
	packetID := uint16(PACKET_VERSION)<<13 |
		uint16(PACKET_TYPE)<<12 |
		uint16(SEC_HDR_FLAG)<<11 |
		uint16(APID)

	// PacketSeqCtrl: SeqFlags(2) | SeqCount(14)
	packetSeqCtrl := uint16(SEQ_FLAGS)<<14 | (*seqCount & 0x3FFF)

	// Generate telemetry data
	payload := generateTelemetryPayload(*seqCount%5 == 0)

	// Calculate total packet length (excluding primary header first 6 bytes)
	packetDataLength := uint16(binary.Size(CCSDSSecondaryHeader{}) +
		binary.Size(TelemetryPayload{}) - 1)

	primaryHeader := CCSDSPrimaryHeader{
		PacketID:      packetID,
		PacketSeqCtrl: packetSeqCtrl,
		PacketLength:  packetDataLength,
	}

	// Create secondary header
	secondaryHeader := CCSDSSecondaryHeader{
		Timestamp:   uint64(time.Now().Unix()),
		SubsystemID: SUBSYSTEM_ID,
	}

	// Write headers and payload
	binary.Write(buf, binary.BigEndian, primaryHeader) // CCSDS uses big-endian
	binary.Write(buf, binary.BigEndian, secondaryHeader)
	binary.Write(buf, binary.BigEndian, payload)

	return buf.Bytes()
}

func generateTelemetryPayload(generateAnomaly bool) TelemetryPayload {
	if generateAnomaly {
		// Randomly choose one parameter to be anomalous
		anomalyType := rand.Intn(4)
		switch anomalyType {
		case 0:
			return TelemetryPayload{
				Temperature: randomFloat(35.0, 40.0), // High temperature anomaly
				Battery:     randomFloat(70.0, 100.0),
				Altitude:    randomFloat(500.0, 550.0),
				Signal:      randomFloat(-60.0, -40.0),
			}
		case 1:
			return TelemetryPayload{
				Temperature: randomFloat(20.0, 30.0),
				Battery:     randomFloat(20.0, 40.0), // Low battery anomaly
				Altitude:    randomFloat(500.0, 550.0),
				Signal:      randomFloat(-60.0, -40.0),
			}
		case 2:
			return TelemetryPayload{
				Temperature: randomFloat(20.0, 30.0),
				Battery:     randomFloat(70.0, 100.0),
				Altitude:    randomFloat(300.0, 400.0), // Low altitude anomaly
				Signal:      randomFloat(-60.0, -40.0),
			}
		default:
			return TelemetryPayload{
				Temperature: randomFloat(20.0, 30.0),
				Battery:     randomFloat(70.0, 100.0),
				Altitude:    randomFloat(500.0, 550.0),
				Signal:      randomFloat(-90.0, -80.0), // Weak signal anomaly
			}
		}
	}

	return TelemetryPayload{
		Temperature: randomFloat(20.0, 30.0),   // Normal operating range
		Battery:     randomFloat(70.0, 100.0),  // Battery percentage
		Altitude:    randomFloat(500.0, 550.0), // Orbit altitude
		Signal:      randomFloat(-60.0, -40.0), // Signal strength
	}
}

func randomFloat(min, max float32) float32 {
	return min + rand.Float32()*(max-min)
}
