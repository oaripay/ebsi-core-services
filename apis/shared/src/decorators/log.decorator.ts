import { SetMetadata } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

export const METHOD_LOG_METADATA = "METHOD_LOG_METADATA";

/**
 * Log options
 */
export interface LogOptions {
  /**
   * If true, it will log the request and response. Errors are always logged.
   */
  logRequest?: boolean | ((req: FastifyRequest) => boolean);
}

/**
 * Log decorator. It allows to customise logging behaviour for each route.
 * @param options the logging options
 */
export const Log = (options: LogOptions) =>
  SetMetadata(METHOD_LOG_METADATA, options);
