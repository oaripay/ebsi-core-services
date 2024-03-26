// Copied from https://github.com/algoan/nestjs-components/blob/master/packages/logging-interceptor/src/logging.interceptor.ts
import {
  type CallHandler,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyRequest, FastifyReply } from "fastify";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { ApiConfig } from "../config/configuration.js";

/**
 * Interceptor that logs input/output requests
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly ctxPrefix: string = LoggingInterceptor.name;

  private readonly logger: Logger = new Logger(this.ctxPrefix);

  constructor(private configService: ConfigService<ApiConfig, true>) {}

  /**
   * Intercept method, logs before and after the request being processed
   * @param context details about the current request
   * @param call$ implements the handle method that returns an Observable
   */
  public intercept(
    context: ExecutionContext,
    call$: CallHandler,
  ): Observable<unknown> {
    const req: FastifyRequest = context
      .switchToHttp()
      .getRequest<FastifyRequest>();
    const { method, url, body, headers } = req;
    const skipLogging = headers && "ebsi-healthcheck" in headers;

    if (!skipLogging) {
      const ctx = `${this.ctxPrefix} - ${method} - ${url}`;
      const message = `Incoming request - ${method} - ${url}`;

      this.logger.log(
        {
          message,
          method,
          body,
          headers,
        },
        ctx,
      );
    }

    return call$.handle().pipe(
      tap({
        next: (val: unknown): void => {
          this.logNext(val, context);
        },
        error: (err: Error): void => {
          this.logError(err, context);
        },
      }),
    );
  }

  /**
   * Logs the request response in success cases
   * @param body body returned
   * @param context details about the current request
   */
  private logNext(body: unknown, context: ExecutionContext): void {
    const req: FastifyRequest = context
      .switchToHttp()
      .getRequest<FastifyRequest>();
    const res: FastifyReply = context
      .switchToHttp()
      .getResponse<FastifyReply>();
    const { method, url, headers } = req;
    const skipLogging = headers && "ebsi-healthcheck" in headers;

    if (!skipLogging) {
      const { statusCode } = res;
      const ctx = `${this.ctxPrefix} - ${statusCode} - ${method} - ${url}`;
      const message = `Outgoing response - ${statusCode} - ${method} - ${url}`;
      const logLevel = this.configService.get("logLevel", { infer: true });
      this.logger.log(
        {
          message,
          ...(logLevel === "debug" && { body }),
        },
        ctx,
      );
    }
  }

  /**
   * Logs the request response in success cases
   * @param error Error object
   * @param context details about the current request
   */
  private logError(error: Error, context: ExecutionContext): void {
    const req: FastifyRequest = context
      .switchToHttp()
      .getRequest<FastifyRequest>();
    const { method, url, body } = req;

    if (error instanceof HttpException) {
      const statusCode: number = error.getStatus();
      const ctx = `${this.ctxPrefix} - ${statusCode} - ${method} - ${url}`;
      const message = `Outgoing response - ${statusCode} - ${method} - ${url}`;
      const jsonLog = {
        method,
        url,
        body,
        message,
        error,
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
}

export default LoggingInterceptor;
