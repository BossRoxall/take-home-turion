// Types
import { FastifyPluginAsync } from "fastify";
import { sub } from "date-fns";

/**
 * Query Parameters:
 * - start_time (`ISO8601`)
 * - end_time (`ISO8601`)
 */

interface IQuery {
  start_time: Date; // Filter to deleted/non-deleted records
  end_time: Date; // Scrub config data (API keys!) by default
}

const responseAggregateObject = {
  type: "object",
  properties: {
    minimum: { type: "number", format: "float" },
    maximum: { type: "number", format: "float" },
    average: { type: "number", format: "float" },
  },
};

const schema: any = {
  tags: ["Telemetry"],
  summary:
    "Retrieves calculated data for the measurements in the time period requested",
  operationId: "getTelemetryAggregate",
  description:
    "Retrieves the Minimum, Maximum, and Average value for each measurement (altitude, battery, signal, temperature) for the time period specified",
  querystring: {
    allOf: [
      //   TODO: Pagination
      // { $ref: "PaginationInput#" },
      // { $ref: "FilterInput#" },
      {
        type: "object",
        properties: {
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
            reqId: { type: "string", format: "uuid" },
            data: {
              type: "object",
              properties: {
                altitude: responseAggregateObject,
                battery: responseAggregateObject,
                signal: responseAggregateObject,
                temperature: responseAggregateObject,
              },
            },
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
  fastify.log.info("Loading route: /telemetry/aggregate");

  fastify.get<{ Querystring: IQuery }>(
    "/aggregate",
    {
      schema,
      // onRequest: fastify.auth([fastify.authenticate]),
    },
    async function getAggregateTelemetry(req) {
      const log = req.log.child({ api: "getAggregateTelemetry" });
      const client = await fastify.pg.connect();

      log.info("[*] Starting API[getAggregateTelemetry]");

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

        const { rows } = await client.query<FastifyPluginAsync>(
          `
            SELECT 
              subsystem_id, 
              MIN(altitude) AS altitude_min, MAX(altitude) AS altitude_max, AVG(altitude) AS altitude_avg,
              MIN(battery) AS battery_min, MAX(battery) AS battery_max, AVG(battery) AS battery_avg,
              MIN(signal) AS signal_min, MAX(signal) AS signal_max, AVG(signal) AS signal_avg,
              MIN(temperature) AS temperature_min, MAX(temperature) AS temperature_max, AVG(temperature) AS temperature_avg
            FROM telemetry.public.ccsds_packets
            WHERE timestamp BETWEEN $1 AND $2
            GROUP BY subsystem_id
          `,
          [start_time, end_time],
        );

        const record: any = rows[0];

        log.debug({ record }, `Aggregate telemetry rows included in result`);

        log.debug("[*] Finished API[getAggregateTelemetry]");
        return {
          reqId: req.id,
          startTime: start_time,
          endTime: end_time,
          data: record
            ? {
                altitude: {
                  minimum: record.altitude_min,
                  maximum: record.altitude_max,
                  average: record.altitude_avg,
                },
                battery: {
                  minimum: record.battery_min,
                  maximum: record.battery_max,
                  average: record.battery_avg,
                },
                signal: {
                  minimum: record.signal_min,
                  maximum: record.signal_max,
                  average: record.signal_avg,
                },
                temperature: {
                  minimum: record.temperature_min,
                  maximum: record.temperature_max,
                  average: record.temperature_avg,
                },
              }
            : {},
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
