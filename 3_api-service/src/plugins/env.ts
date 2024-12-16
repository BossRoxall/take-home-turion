import fp from "fastify-plugin";
import fastifyEnv, { FastifyEnvOptions } from "@fastify/env";

// With more time: json-schema-to-ts to mitigate synchronize types with schemas
const schema = {
  type: "object",
  required: [
    "npm_package_name",
    "npm_package_version",
    "API_PORT",
    "POSTGRES_HOSTNAME",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_PORT",
    "POSTGRES_DB",
  ],
  properties: {
    // Package values: requires starting with npm command
    npm_package_name: { type: "string" },
    npm_package_version: { type: "string" },
    // Server Variables
    API_PORT: { type: "number", default: 8000 },
    // Database Variables
    POSTGRES_DB: { type: "string", default: "telemetry" },
    POSTGRES_HOSTNAME: { type: "string", default: "timescaledb" },
    POSTGRES_PASSWORD: { type: "string", default: "nimda" },
    POSTGRES_PORT: { type: "number", default: 5432 },
    POSTGRES_USER: { type: "string", default: "admin" },
  },
};

const options: FastifyEnvOptions = {
  dotenv: true,
  confKey: "config", // optional, default: 'config'
  schema,
};

export default fp<FastifyEnvOptions>(
  async (fastify) => {
    fastify.log.debug({ plugin: "env" }, "[Env] Loading Plugin");

    await fastify.register(fastifyEnv, options);

    fastify.log.info({ plugin: "env" }, "[Env] Loaded Plugin");
  },
  { name: "env" },
);

// When using .decorate you have to specify added properties for Typescript
declare module "fastify" {
  export interface FastifyInstance {
    config: {
      // Package values
      npm_package_name: string;
      npm_package_version: string;
      // Server Variables
      API_PORT: number;
      // Vault Variables
      POSTGRES_DB: string;
      POSTGRES_HOSTNAME: string;
      POSTGRES_PASSWORD: string;
      POSTGRES_PORT: string;
      POSTGRES_USER: string;
    };
  }
}
