module.exports = {
  $id: "HealthCheck",
  type: "object",
  required: ["statusCode"],
  properties: {
    statusCode: { type: "number" },
    reqId: {
      type: "string",
      format: "uuid",
      description: "Message Broadcast identifier for this message.",
    },
    status: {
      type: "object",
      additionalProperties: {
        type: "boolean",
      },
    },
  },
};
