// Load this first: disabled as no listener configured (127.0.0.1:4318)
// require("./utilities/openTelemetry");

// Import environment variables
require("dotenv").config();

import { v4 } from "uuid";
import { join } from "path";
import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import { FastifyPluginAsync, FastifyServerOptions } from "fastify";

export interface AppOptions
  extends FastifyServerOptions,
    Partial<AutoloadPluginOptions> {}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
  genReqId: () => v4(),
  disableRequestLogging: true,
  // Exclude tests
  ignoreFilter: (path) => path.endsWith(".spec.js"),
};

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts,
): Promise<void> => {
  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "plugins"),
    options: opts,
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "routes"),
    options: { prefix: "/api/v1" }, // Optional: Adds a prefix to all routes
    dirNameRoutePrefix: true, // Include directory names in route prefixes
  });
};

export default app;
export { app, options };
