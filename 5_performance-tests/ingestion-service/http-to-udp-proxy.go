package main

import (
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
)

const (
	destinationAddress = "ingestion-service:8089" // UDP server address where ingestion-service listens
	proxyPort          = ":8091"                  // HTTP proxy port
)

func main() {
	// HTTP endpoint to receive the binary payload
	http.HandleFunc("/udp-proxy", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Only POST method allowed", http.StatusMethodNotAllowed)
			return
		}

		// Read binary payload from HTTP body
		payload, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read request body", http.StatusInternalServerError)
			return
		}
		defer r.Body.Close()

		// Forward the payload to the UDP server
		err = sendToUDP(payload)
		if err != nil {
			http.Error(w, "Failed to send data to UDP server", http.StatusInternalServerError)
			log.Printf("Error forwarding to UDP: %v", err)
			return
		}

		// Respond to the HTTP client
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("success"))
	})

	// Start the HTTP server
	log.Printf("HTTP-to-UDP proxy running on http://localhost%s/ingest\n", proxyPort)
	err := http.ListenAndServe(proxyPort, nil)
	if err != nil {
		log.Fatalf("Failed to start HTTP server: %v", err)
	}
}

// sendToUDP forwards the payload to the UDP server
func sendToUDP(payload []byte) error {
	conn, err := net.Dial("udp", destinationAddress)
	if err != nil {
		return fmt.Errorf("failed to connect to UDP server: %w", err)
	}
	defer conn.Close()

	// Send the binary payload
	_, err = conn.Write(payload)
	if err != nil {
		return fmt.Errorf("failed to write to UDP server: %w", err)
	}

	log.Printf("Forwarded %d bytes to UDP server at %s\n", len(payload), destinationAddress)
	return nil
}
