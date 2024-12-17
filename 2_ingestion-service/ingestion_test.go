package main

import (
	"bytes"
	"encoding/binary"
	"net"
	"os"
	"strconv"
	"testing"
	"time"
)

// Constants
const (
	testPort          string  = "8000"
	testPacketId      uint16  = 0x1234
	testPacketSeqCtrl uint16  = 0x5678
	testPacketLength  uint16  = 0x000A
	testTimestamp     uint64  = 1640995200
	testSubsystemId   uint16  = 42
	testAltitude      float32 = 500.0
	testBattery       float32 = 85.0
	testSignal        float32 = 75.0
	testTemperature   float32 = 25.0
)

// Default test telemetry
var testPayload = TelemetryPayload{
	Altitude:    testAltitude,
	Battery:     testBattery,
	Signal:      testSignal,
	Temperature: testTemperature,
}

// Mock data for tests
func mockTelemetryPacket(payload TelemetryPayload) []byte {
	// Create a byte buffer to simulate a telemetry packet
	buf := new(bytes.Buffer)

	// Mock primary header
	binary.Write(buf, binary.BigEndian, testPacketId)
	binary.Write(buf, binary.BigEndian, testPacketSeqCtrl)
	binary.Write(buf, binary.BigEndian, testPacketLength)

	// Mock secondary header
	binary.Write(buf, binary.BigEndian, testTimestamp)
	binary.Write(buf, binary.BigEndian, testSubsystemId)

	// Mock telemetry payload
	binary.Write(buf, binary.BigEndian, payload.Temperature)
	binary.Write(buf, binary.BigEndian, payload.Battery)
	binary.Write(buf, binary.BigEndian, payload.Altitude)
	binary.Write(buf, binary.BigEndian, payload.Signal)

	return buf.Bytes()
}

// Test parsing of primary header
func TestParsePrimaryHeader(t *testing.T) {
	data := mockTelemetryPacket(testPayload)

	var header CCSDSPrimaryHeader
	err := binary.Read(bytes.NewReader(data[:6]), binary.BigEndian, &header)
	if err != nil {
		t.Fatalf("Failed to parse primary header: %v", err)
	}
	if header.PacketID != testPacketId {
		t.Errorf("Expected PacketID 0x%x, got 0x%x", testPacketId, header.PacketID)
	}
	if header.PacketLength != testPacketLength {
		t.Errorf("Expected PacketLength 0x%x, got 0x%x", testPacketLength, header.PacketLength)
	}
}

// Test parsing of secondary header
func TestParseSecondaryHeader(t *testing.T) {
	data := mockTelemetryPacket(testPayload)
	var header CCSDSSecondaryHeader
	err := binary.Read(bytes.NewReader(data[6:16]), binary.BigEndian, &header)
	if err != nil {
		t.Fatalf("Failed to parse secondary header: %v", err)
	}
	if header.Timestamp != testTimestamp {
		t.Errorf("Expected Timestamp %d, got %d", testTimestamp, header.Timestamp)
	}
	if header.SubsystemID != testSubsystemId {
		t.Errorf("Expected SubsystemID %d, got %d", testSubsystemId, header.SubsystemID)
	}
}

// Test parsing of telemetry payload
func TestParseTelemetryPayload(t *testing.T) {
	data := mockTelemetryPacket(testPayload)

	var payload TelemetryPayload
	err := binary.Read(bytes.NewReader(data[16:]), binary.BigEndian, &payload)
	if err != nil {
		t.Fatalf("Failed to parse telemetry payload: %v", err)
	}
	if payload.Altitude != testPayload.Altitude {
		t.Errorf("Expected Altitude %f, got %f", testPayload.Altitude, payload.Altitude)
	}
	if payload.Battery != testPayload.Battery {
		t.Errorf("Expected Battery %f, got %f", testPayload.Battery, payload.Battery)
	}
	if payload.Signal != testPayload.Signal {
		t.Errorf("Expected Signal %f, got %f", testPayload.Signal, payload.Signal)
	}
	if payload.Temperature != testPayload.Temperature {
		t.Errorf("Expected Temperature %f, got %f", testPayload.Temperature, payload.Temperature)
	}
}

// TestGetAppPortFromEnv tests the getAppPortFromEnv function
func TestGetAppPortFromEnv(t *testing.T) {
	// Test case 1: Environment variable is not set (default behavior)
	_, err := getAppPortFromEnv("NON_EXISTENT_APP_PORT")
	if err == nil {
		t.Errorf("Should have returned error if ENV variable is not set.")
	}

	// Test case 2: Environment variable is set
	testPortLabel := "APP_PORT"
	err = os.Setenv(testPortLabel, testPort)
	if err != nil {
		t.Errorf("Failed to set test variable to environment: %s", testPortLabel)
	}
	port, err := getAppPortFromEnv(testPortLabel)
	if err != nil {
		t.Errorf("Failed to get app port from environment: %s", testPortLabel)
	}
	if strconv.Itoa(port) != testPort {
		t.Errorf("Expected port %s, got %d", testPort, port)
	}

	//Clean up
	err = os.Unsetenv(testPortLabel)
	if err != nil {
		t.Errorf("Failed to unset %s variable from environment", testPortLabel)
	}
}

func TestStartHealthCheckServer(t *testing.T) {
	err := os.Setenv("HEALTHCHECK_PORT", testPort)
	if err != nil {
		t.Errorf("Failed to set test variable to environment: %s", "HEALTHCHECK_PORT")
	}

	// Start the UDP health check server in a goroutine
	go StartHealthCheckServer()

	// Allow some time for the server to start
	time.Sleep(100 * time.Millisecond) // Adjust this delay if needed

	// Create a UDP client
	serverAddr, err := net.ResolveUDPAddr("udp", "127.0.0.1:"+testPort)
	if err != nil {
		t.Fatalf("Failed to resolve UDP address: %v", err)
	}

	clientConn, err := net.DialUDP("udp", nil, serverAddr)
	if err != nil {
		t.Fatalf("Failed to create UDP client: %v", err)
	}
	defer clientConn.Close()

	// Send a health check request
	request := []byte("healthcheck")
	_, err = clientConn.Write(request)
	if err != nil {
		t.Fatalf("Failed to send UDP request: %v", err)
	}

	// Read the response
	buffer := make([]byte, 1024)
	err = clientConn.SetReadDeadline(time.Now().Add(1 * time.Second))
	if err != nil {
		return
	} // Timeout for response
	n, _, err := clientConn.ReadFrom(buffer)
	if err != nil {
		t.Fatalf("Failed to read UDP response: %v", err)
	}

	// Validate the response
	expectedResponse := "healthy" // Replace with the expected response
	if string(buffer[:n]) != expectedResponse {
		t.Errorf("Unexpected response: got %s, want %s", string(buffer[:n]), expectedResponse)
	}
}
