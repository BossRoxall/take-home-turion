// Types
import { FastifyInstance, FastifyPluginAsync } from "fastify";

interface HealthResponse {
  reqId: string;
  statusCode: 200 | 500;
  status: {
    [dependency: string]: boolean;
  };
}

// NOTE: each file should be 1 METHOD of 1 API PATH!

const swaggerSchema: any = {
  schema: {
    tags: ["Utilities"],
    operationId: "healthCheck",
    summary: "Service health check",
    description:
      "Simple route to allow external services to verify the process's health",
    response: {
      200: { description: "Internal Server Error", $ref: "HealthCheck#" },
      500: { description: "Internal Server Error", $ref: "HealthCheck#" },
    },
  },
};

const plugin: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.log.info("Loading route: /health");

  fastify.get("/health", swaggerSchema, async function health(req, reply) {
    const log = req.log.child({ api: "health" });

    log.info("[*] Starting API[health]");

    // Assume unhealthy
    const response: HealthResponse = {
      reqId: req.id,
      statusCode: 500,
      status: {
        postgres: false,
      },
    };

    try {
      log.debug("Checking database connection health");

      // Perform health checks in parallel, return booleans
      const [postgres] = await Promise.allSettled([
        checkPostgres(fastify),
        // TODO: Redis, etc...
      ]).then((results) => results.map(checkStatusResults));

      // Update response object
      Object.assign(response.status, { postgres });

      // If any unsuccessful, consider service unhealthy (faster to look for 1 than confirm all)
      if (Object.values(response.status).some((isHealthy) => !isHealthy)) {
        log.warn({ status: response.status }, "Service unhealthy");
      }
      // Otherwise, all services are healthy => consider service healthy
      else {
        log.debug({ status: response.status }, "Service healthy");
        response.statusCode = 200;
      }
    } catch (error) {
      log.error({ error }, `Health check error`);
    } finally {
      log.debug("[*] Completed API[health]");
      reply.status(response.statusCode).send(response);
    }
  });
};

export default plugin;

function checkStatusResults(result: PromiseSettledResult<boolean>) {
  if (result.status === "fulfilled") {
    return result.value;
  }
  return false;
}

async function checkPostgres(fastify: FastifyInstance) {
  const client = await fastify.pg.connect();

  try {
    await client.query<FastifyPluginAsync>("SELECT 1");
    return true;
  } catch (error) {
    return false;
  } finally {
    client.release();
  }
}
