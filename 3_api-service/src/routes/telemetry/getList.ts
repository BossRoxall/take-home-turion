// Utils
import { sub } from "date-fns";

// Types
import { FastifyPluginAsync } from "fastify";

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
  summary: "Retrieves an array of telemetry data between the provided times.",
  operationId: "getTelemetryList",
  description: "Returns a paginated array of Telemetry objects",
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
  fastify.log.info("Loading route: /telemetry");

  fastify.get<{ Querystring: IQuery }>(
    "/",
    {
      schema,
      // onRequest: fastify.auth([fastify.authenticate]),
    },
    async function getTelemetry(req) {
      const log = req.log.child({ api: "getTelemetry" });
      const client = await fastify.pg.connect();

      log.info("[*] Starting API[getTelemetry]");

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

        // TODO: Execute Query
        const [selectCount, { rows }] = await Promise.all([
          client.query<FastifyPluginAsync>(
            `
              SELECT COUNT(*)
              FROM ccsds_packets
              WHERE timestamp BETWEEN $1 AND $2
            `,
            [start_time, end_time],
          ),
          client.query<FastifyPluginAsync>(
            `
              SELECT 
                id, apid, seq_flags, seq_count, timestamp, subsystem_id, temperature, battery, altitude, signal
              FROM telemetry.public.ccsds_packets
              WHERE
                timestamp BETWEEN $1 AND $2
              ORDER BY timestamp DESC
              LIMIT 50
            `,
            [start_time, end_time],
          ),
        ]).finally(client.release);

        // @ts-ignore
        const totalRecords = selectCount.rows[0].count;

        log.debug(
          { totalRecords },
          `${rows.length} telemetry rows included in result`,
        );

        log.debug("[*] Finished API[getTelemetry]");
        return {
          reqId: req.id,
          // limit,
          // page,
          // totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
          data: rows,
          startTime: start_time,
          endTime: end_time,
        };
      } catch (error) {
        log.error(error, "Error getting telemetry data");
        return fastify.httpErrors.internalServerError();
      }
    },
  );
};

export default plugin;
