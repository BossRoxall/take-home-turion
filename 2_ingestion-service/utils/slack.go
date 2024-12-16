package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

// SlackMessage defines the payload structure for Slack notifications
type SlackMessage struct {
	Text string `json:"text"`
}

// SendSlackNotification sends a message to the configured Slack webhook
func SendSlackNotification(message string) error {
	// Optimization: extract once and cache
	slackWebhookURL := os.Getenv("SLACK_WEBHOOK_URL")

	if slackWebhookURL == "" {
		return fmt.Errorf("SLACK_WEBHOOK_URL not defined")
	}

	// Construct + send payload
	payload := SlackMessage{Text: message}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal Slack message: %w", err)
	}

	resp, err := http.Post(slackWebhookURL, "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to send Slack notification: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("slack notification failed with status: %s", resp.Status)
	}

	return nil
}
