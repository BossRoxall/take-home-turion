module.exports = {
  $id: "Error",
  type: "object",
  required: ["statusCode", "message"],
  properties: {
    statusCode: {
      type: "integer",
      format: "int32",
      description: "HTTP Status Code for the error",
      examples: [400, 401, 403, 404, 500],
    },
    error: {
      type: "string",
      description: "Summary text of the error",
      examples: ["Bad Request", "Not Found"],
    },
    message: {
      type: "string",
      description: "Descriptive text of the error",
    },
    reqId: {
      type: "string",
      format: "uuid",
      description: "Identifier for this API call.",
    },
  },
};
