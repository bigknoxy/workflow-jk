import { FastifyRequest, FastifyReply } from "fastify";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a path parameter is a valid UUID.
 * Returns 400 if the parameter value exists but is not a valid UUID.
 */
export function validateUuid(paramName: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const params = request.params as Record<string, string>;
    const value = params?.[paramName];
    if (value && !UUID_REGEX.test(value)) {
      return reply.status(400).send({
        error: "Bad Request",
        message: `Invalid ${paramName}: must be a valid UUID`,
      });
    }
  };
}