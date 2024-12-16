module.exports = {
  $id: "ResponseFilterTime",
  type: "object",
  description: "Confirm the startTime and endTime bounds for the result set",
  properties: {
    startTime: {
      type: "string",
      format: "date-time",
      description: "ISO8601 Datetime string",
    },
    endTime: {
      type: "string",
      format: "date-time",
      description: "ISO8601 Datetime string",
    },
  },
};
