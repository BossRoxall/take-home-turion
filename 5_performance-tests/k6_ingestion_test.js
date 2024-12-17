import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 120,            // Virtual users
    // iterations: 500,    // Number of iterations
    duration: "5m",     // Test duration instead of iterations
    thresholds: {
        http_req_failed: ['rate<0.01'], // http errors should be less than 1%
        http_req_duration: ['p(95)<200', 'p(99)<400'], // 95% of requests should be below 200ms, 99%>400ms
    },
};

export default function () {
    // Send binary payload as a POST request to the HTTP-to-UDP proxy
    const url = 'http://localhost:8091/udp-proxy';
    const binaryPayload = createBinaryPayload();
    const params = {
        headers: {
            'Content-Type': 'application/octet-stream', // Indicate binary data
        },
    };

    const res = http.post(url, binaryPayload.buffer, params);

    check(res, {
        'is status 200': (r) => r.status === 200,
        'is response valid': (r) => r.body.toString() === "success",
    });

    sleep(0.012); // 1 second between requests
}

// Function to construct binary payload
function createBinaryPayload() {
    const buffer = new ArrayBuffer(32); // Total payload size: 32 bytes
    const view = new DataView(buffer);

    // Primary Header
    view.setUint16(0, 0x1234); // PacketID
    view.setUint16(2, 0x5678); // PacketSeqCtrl
    view.setUint16(4, 10);     // PacketLength

    // Secondary Header
    view.setBigUint64(6, BigInt(Math.floor(Date.now() / 1000))); // Timestamp (seconds since epoch)
    view.setUint16(14, 42);                         // SubsystemID

    // Telemetry Payload
    view.setFloat32(16, 25.0);   // Temperature
    view.setFloat32(20, 85.0);   // Battery
    view.setFloat32(24, 500.0);  // Altitude
    view.setFloat32(28, 75.0);   // Signal

    return new Uint8Array(buffer);
}