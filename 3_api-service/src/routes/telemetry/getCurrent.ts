// Types
import { FastifyPluginAsync } from "fastify";

const schema: any = {
  tags: ["Telemetry"],
  summary: "Retrieves most recent telemetry record",
  operationId: "getTelemetryCurrent",
  description: "Returns the single most recent telemetry record",
  response: {
    200: {
      description: "Successfully retrieved telemetry data.",
      type: "object",
      properties: {
        reqId: { type: "string", format: "uuid" },
        data: { $ref: "Telemetry#" },
      },
    },
    400: { description: "Bad Request", $ref: "Error#" },
    401: { description: "Unauthorized", $ref: "Error#" },
    403: { description: "Forbidden", $ref: "Error#" },
    500: { description: "Internal Server Error", $ref: "Error#" },
  },
  // TODO: authentication!
  // security: [{ bearerAuth: [] }],
};

const plugin: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.log.info("Loading route: /telemetry/current");

  fastify.get<{}>(
    "/current",
    {
      schema,
      // onRequest: fastify.auth([fastify.authenticate]),
    },
    async function getCurrentTelemetry(req) {
      const log = req.log.child({ api: "getCurrentTelemetry" });
      const client = await fastify.pg.connect();

      log.info("[*] Starting API[getCurrentTelemetry]");

      try {
        // TODO: Execute Query
        const { rows } = await client.query<FastifyPluginAsync>(
          `
            SELECT 
              id, apid, seq_flags, seq_count, timestamp, subsystem_id, temperature, battery, altitude, signal
            FROM telemetry.public.ccsds_packets
            ORDER BY timestamp DESC
            LIMIT 1
          `,
        );

        log.debug(
          { record: rows[0] },
          `Current telemetry rows included in result`,
        );

        log.debug("[*] Finished API[getCurrentTelemetry]");
        return { reqId: req.id, data: rows[0] };
      } catch (error) {
        log.error(error, "Error getting current telemetry record");
        return fastify.httpErrors.internalServerError();
      } finally {
        // Always release pool
        client.release();
      }
    },
  );
};

export default plugin;
