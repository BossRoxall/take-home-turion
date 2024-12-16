module.exports = {
  $id: "Telemetry",
  type: "object",
  description: "A telemetry record from a satellite",
  required: ["id", "apid", "seq_flags", "seq_count", "timestamp"],
  properties: {
    id: {
      type: "integer",
      description: "Database ID for this packet",
    },
    apid: {
      type: "integer",
      description: "PacketID received from the source",
    },
    seq_flags: {
      type: "integer",
      description: "Sequence Flag (???)",
    },
    seq_count: {
      type: "integer",
      description: "Index of the packet from the generator",
    },
    timestamp: {
      type: "string",
      format: "date-time",
      description: "ISO-8601 Date string when the measurement was taken.",
    },
    subsystem_id: {
      type: "integer",
      description: "ID for the subsystem (???)",
    },
    altitude: {
      type: "number",
      format: "float",
      description: "Altitude reading in kilometers",
    },
    battery: {
      type: "number",
      format: "float",
      description: "Battery charge expressed as a percentage remaining",
    },
    signal: {
      type: "number",
      format: "float",
      description: "Signal strength in decibels",
    },
    temperature: {
      type: "number",
      format: "float",
      description: "Temperature reading in degrees Celsius",
    },
  },
};
