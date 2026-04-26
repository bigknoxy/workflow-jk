/**
 * API Server - Fastify-based REST API for the workflow-jk platform.
 */
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { loadConfig } from "@workflow-jk/config";
import { createContainer } from "@workflow-jk/application";
import { setupObservability, createLogger } from "@workflow-jk/observability";
import { registerRoutes } from "./routes";

const gracefulShutdownObservability = async (): Promise<void> => {
  try {
    const mod = await import("@workflow-jk/observability");
    if ("shutdownObservability" in mod) {
      await mod.shutdownObservability();
    }
  } catch {
    // Observability shutdown is best-effort
  }
};

let app: FastifyInstance | undefined;
let container: Awaited<ReturnType<typeof createContainer>>;

async function gracefulShutdown(signal: string): Promise<void> {
  if (!app) return;

  console.log(`Received ${signal}, shutting down gracefully...`);

  if (container?.dbPool) {
    try {
      await container.dbPool.end();
    } catch (e) {
      console.error("Error closing DB pool:", e);
    }
  }

try {
      await gracefulShutdownObservability();
    } catch (e) {
      console.error("Error shutting down observability:", e);
    }

  const timeout = setTimeout(() => {
    console.error("Forced shutdown after 10s timeout");
    process.exit(1);
  }, 10000);

  try {
    await app.close();
    clearTimeout(timeout);
    console.log("Server closed");
  } catch (e) {
    console.error("Error closing server:", e);
  }

  process.exit(0);
}

async function main() {
  const config = loadConfig();
  
  setupObservability({
    serviceName: "workflow-jk-api",
    otlpEndpoint: config.otlpEndpoint,
    enabled: config.observabilityEnabled,
  });

  const logger = createLogger({ service: "api" });
  container = createContainer(config);

  app = Fastify({ logger: false });

  // Helmet for security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", config.apiBaseUrl, config.webUrl],
      },
    },
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: "1 minute",
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
  });

  // CORS — use config value
  const corsOrigins = config.corsOrigin.split(",").map((s: string) => s.trim());
  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });

  registerRoutes(app, container, logger);

  // Global error handler - must be set after routes are registered
  app.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
    const method = request.method;
    const url = request.url;
    const err = error instanceof Error ? error : new Error(String(error));
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    const requestId = request.id;

    // Log the error with request context
    logger.error(`Request error ${statusCode}`, { method, url, requestId }, err);

    // Return appropriate JSON error response
    if (statusCode === 401) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Authentication required",
        requestId,
      });
    }

    if (statusCode === 403) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Insufficient permissions",
        requestId,
      });
    }

    if (statusCode === 400) {
      return reply.status(400).send({
        error: "Bad Request",
        message: err.message || "Invalid request parameters",
        requestId,
      });
    }

    if (statusCode === 404) {
      return reply.status(404).send({
        error: "Not Found",
        message: err.message || "Resource not found",
        requestId,
      });
    }

    if (statusCode >= 500) {
      return reply.status(statusCode).send({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
        requestId,
      });
    }

    // Default error response for other status codes
    return reply.status(statusCode).send({
      error: err.name || "Error",
      message: err.message || "Request failed",
      requestId,
    });
  });

  try {
    await app.listen({ port: config.port, host: config.host });
    logger.info(`API server listening on ${config.host}:${config.port}`);
  } catch (err) {
    logger.error("Failed to start server", undefined, err instanceof Error ? err : undefined);
    process.exit(1);
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

main();