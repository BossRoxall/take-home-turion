import fp from "fastify-plugin";
import fs from "fs/promises";
import { resolve } from "path";

// Adds Schema support to APIs
// https://github.com/fastify/fastify-swagger
export default fp(async (fastify) => {
  const log = fastify.log.child(
    { plugin: "swaggerUI" },
    { msgPrefix: "[SwaggerUI] " },
  );

  log.debug("Loading Plugin");

  await fastify.register(require("@fastify/swagger"), swaggerOptions);

  const path = resolve(__dirname, "..", "swagger");

  // Iterate through the swagger directory and loads schemas
  for (const file of await fs.readdir(path)) {
    // Ensure only loading schemas
    if (file.startsWith("schema")) {
      log.warn(`Adding file[${file}]`);
      fastify.addSchema(require(`${path}/${file}`));
    }
  }

  await fastify.register(require("@fastify/swagger-ui"), {
    routePrefix: "/documentation",
    // https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  log.info("Loaded Plugin");
});

const swaggerOptions = {
  openapi: {
    info: {
      title: "Turion Take Home Test API Documentation",
      description:
        "This is the OpenAPI specification for the Turion Take Home Test API.",
      version: process.env.npm_package_version,
      servers: [
        {
          url: `http://localhost:${process.env.PORT}/api/v1`,
          description: "Local server (uses dev data)",
        },
      ],
    },
    tags: [
      {
        name: "Utilities",
        description: "Utility endpoints like the health check endpoint.",
      },
      {
        name: "Telemetry",
        description: "Telemetry endpoints like the getTelemetry endpoint.",
      },
    ],
    // TODO: Authentication!
    // components: {
    //   securitySchemes: {
    //     bearerAuth: {
    //       type: "http",
    //       scheme: "bearer",
    //       bearerFormat: "JWT",
    //     },
    //   },
    // },
  },
};
