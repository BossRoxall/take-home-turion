// Types
import { FastifyPluginAsync } from "fastify";
import { sub } from "date-fns";

/**
 *     - Altitude: 500-550km (normal), <400km (anomaly)
 *     - Battery: 70-100% (normal), <40% (anomaly)
 *     - Signal Strength: -60 to -40dB (normal), <-80dB (anomaly)
 *     - Temperature: 20.0°C to 30.0°C (normal), >35.0°C (anomaly)
 */

const thresholds = {
  altitude: 400,
  battery: 40,
  signal: -80,
  temperature: 35,
};

/**
 * Query Parameters:
 * - start_time (`ISO8601`)
 * - end_time (`ISO8601`)
 */

interface IQuery {
  start_time: Date; // Filter to deleted/non-deleted records
  end_time: Date; // Scrub config data (API keys!) by default
}

const schema: any = {
  tags: ["Telemetry"],
  summary:
    "Retrieves an array of telemetry data with at least 1 anomalous value between the provided times.",
  operationId: "getTelemetryAnomalies",
  description: "Returns the single most recent telemetry record",
  querystring: {
    allOf: [
      //   TODO: Pagination
      // { $ref: "PaginationInput#" },
      // { $ref: "FilterInput#" },
      {
        type: "object",
        properties: {
          reqId: { type: "string", format: "uuid" },
          start_time: {
            type: "string",
            format: "date-time",
            description: "ISO8601 Datetime string",
          },
          end_time: {
            type: "string",
            format: "date-time",
            description: "ISO8601 Datetime string",
          },
        },
      },
    ],
  },
  response: {
    200: {
      type: "object",
      description: "Successfully retrieved telemetry data.",
      allOf: [
        // { $ref: "ResponsePagination#" },
        { $ref: "ResponseFilterTime#" },
        {
          type: "object",
          properties: {
            totalRecords: { type: "integer" },
            data: { type: "array", items: { $ref: "Telemetry#" } },
          },
        },
      ],
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
  fastify.log.info("Loading route: /telemetry/anomalies");

  fastify.get<{ Querystring: IQuery }>(
    "/anomalies",
    {
      schema,
      // onRequest: fastify.auth([fastify.authenticate]),
    },
    async function getAnomalousTelemetry(req) {
      const log = req.log.child({ api: "getAnomalousTelemetry" });
      const client = await fastify.pg.connect();

      log.info("[*] Starting API[getAnomalousTelemetry]");

      let { start_time, end_time } = req.query;

      try {
        if (start_time) {
          log.debug(`Search start_time[${start_time}]`);
        } else {
          start_time = sub(new Date(), { hours: 1 });
        }
        if (end_time) {
          log.debug(`Search end_time[${start_time}]`);
        } else {
          end_time = new Date();
        }

        const [selectCount, { rows }] = await Promise.all([
          client.query<FastifyPluginAsync>(
            `
            SELECT COUNT(*)
            FROM telemetry.public.ccsds_packets
            WHERE
              timestamp BETWEEN $1 AND $2
              AND (
              altitude < $3
                OR battery < $4
                OR signal < $5
                OR temperature > $6
              )
          `,
            [
              start_time,
              end_time,
              thresholds.altitude,
              thresholds.battery,
              thresholds.signal,
              thresholds.temperature,
            ],
          ),
          client.query<FastifyPluginAsync>(
            `
              SELECT 
                id, apid, seq_flags, seq_count, timestamp, subsystem_id, temperature, battery, altitude, signal
              FROM telemetry.public.ccsds_packets
              WHERE
                timestamp BETWEEN $1 AND $2
                AND (
                altitude < $3
                  OR battery < $4
                  OR signal < $5
                  OR temperature > $6
                )
              ORDER BY timestamp DESC
              LIMIT 50
            `,
            [
              start_time,
              end_time,
              thresholds.altitude,
              thresholds.battery,
              thresholds.signal,
              thresholds.temperature,
            ],
          ),
        ]);

        // @ts-ignore
        const totalRecords = selectCount.rows[0].count;

        log.warn(
          { totalRecords },
          `Anomalous telemetry rows included in result`,
        );

        log.debug("[*] Finished API[getCurrentTelemetry]");
        return {
          reqId: req.id,
          totalRecords,
          data: rows,
          startTime: start_time,
          endTime: end_time,
        };
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
