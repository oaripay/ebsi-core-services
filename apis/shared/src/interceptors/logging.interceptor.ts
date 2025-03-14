import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Observable } from "rxjs";

// Copied from https://github.com/algoan/nestjs-components/blob/master/packages/logging-interceptor/src/logging.interceptor.ts
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { tap } from "rxjs/operators";

import type { LogOptions } from "../decorators/log.decorator.ts";

import { METHOD_LOG_METADATA } from "../decorators/log.decorator.ts";

/**
 * Interceptor that logs input/output requests
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly ctxPrefix: string = LoggingInterceptor.name;

  private readonly logger: Logger = new Logger(this.ctxPrefix);

  constructor(
    private logLevel:
      | "debug"
      | "error"
      | "info"
      | "silent"
      | "verbose"
      | "warn",
  ) {}

  /**
   * Intercept method, logs before and after the request being processed
   * @param context details about the current request
   * @param call$ implements the handle method that returns an Observable
   */
  public intercept(
    context: ExecutionContext,
    call$: CallHandler,
  ): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const { body, headers, method, url } = req;

    // Global condition: "ebsi-healthcheck" should not be present in the request headers. If it's the case, the request and response are not logged.
    let logRequest = !(headers && "ebsi-healthcheck" in headers);

    // Local condition: check if the route has the @Log decorator and how it's configured.
    const options = Reflect.getMetadata(
      METHOD_LOG_METADATA,
      context.getHandler(),
    ) as LogOptions | undefined;

    if (logRequest && options?.logRequest !== undefined) {
      logRequest =
        typeof options.logRequest === "function"
          ? options.logRequest(req)
          : options.logRequest;
    }

    // Log request if logRequest is still true at this point
    if (logRequest) {
      const ctx = `${this.ctxPrefix} - ${method} - ${url}`;
      const message = `Incoming request - ${method} - ${url}`;

      this.logger.log(
        {
          body,
          headers,
          message,
          method,
        },
        ctx,
      );
    }

    return call$.handle().pipe(
      tap({
        ...(logRequest && {
          next: (val: unknown): void => {
            this.logNext(val, context);
          },
        }),
        error: (err: Error): void => {
          this.logError(err, context);
        },
      }),
    );
  }

  /**
   * Logs the request in error cases
   * @param error Error object
   * @param context details about the current request
   */
  private logError(error: Error, context: ExecutionContext): void {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const { body, method, url } = req;

    if (error instanceof HttpException) {
      const statusCode = error.getStatus();
      const ctx = `${this.ctxPrefix} - ${statusCode} - ${method} - ${url}`;
      const message = `Outgoing response - ${statusCode} - ${method} - ${url}`;
      const jsonLog = {
        body,
        error,
        message,
        method,
        url,
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(jsonLog, error.stack, ctx);
      } else {
        this.logger.warn(jsonLog, ctx);
      }
    } else {
      this.logger.error(
        {
          message: `Outgoing response - ${method} - ${url}`,
        },
        error.stack,
        `${this.ctxPrefix} - ${method} - ${url}`,
      );
    }
  }

  /**
   * Logs the request response in success cases
   * @param body body returned
   * @param context details about the current request
   */
  private logNext(body: unknown, context: ExecutionContext): void {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const res = context.switchToHttp().getResponse<FastifyReply>();
    const { method, url } = req;

    const { statusCode } = res;
    const ctx = `${this.ctxPrefix} - ${statusCode} - ${method} - ${url}`;
    const message = `Outgoing response - ${statusCode} - ${method} - ${url}`;
    this.logger.log(
      {
        message,
        ...(this.logLevel === "debug" && { body }),
      },
      ctx,
    );
  }
}
