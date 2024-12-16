import fp from "fastify-plugin";
import PostgresPlugin, { PostgresPluginOptions } from "@fastify/postgres";

/**
 * Centralize Postgres connection handling
 */
export default fp<PostgresPluginOptions>(
  async (fastify) => {
    const log = fastify.log.child({}, { msgPrefix: "[Postgres] " });

    // Extract secrets from environment
    const {
      POSTGRES_DB,
      POSTGRES_HOSTNAME,
      POSTGRES_PASSWORD,
      POSTGRES_PORT,
      POSTGRES_USER,
    } = fastify.config;

    log.info("Loading Postgres");
    fastify.register(PostgresPlugin, {
      connectionString: `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOSTNAME}:${POSTGRES_PORT}/${POSTGRES_DB}`,
    });
  },
  { dependencies: ["env"] },
);
