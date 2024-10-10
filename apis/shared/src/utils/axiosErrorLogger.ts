import type { Logger } from "@nestjs/common";
import axios, { type AxiosError } from "axios";
import { stringify } from "safe-stable-stringify";

function formatError(error: AxiosError, message: string) {
  return `AxiosError: ${message}\n${stringify(
    {
      code: error.code,
      message: error.message,
      status: error.status,
      request: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        data: error.config?.data as unknown,
      },
      response: error.response
        ? {
            data: error.response.data,
            status: error.response.status,
            headers: error.response.headers,
          }
        : null,
    },
    null,
    2,
  )}`;
}

export function logAxiosError(
  error: unknown,
  logger: Logger,
  /**
   * Minimum status code to log the error with the "error" level.
   * Errors with a status code below that threshold will be logged with the "log" level.
   */
  minErrorStatus = 400,
): void {
  if (!axios.isAxiosError<unknown, unknown>(error)) return;

  if (error.response) {
    // The request was made and the server responded with a status code that falls out of the range of 2xx
    const level =
      !error.status || error.status >= minErrorStatus ? "error" : "log";

    logger[level](formatError(error, "Bad response"), error.stack);
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
    logger.error(formatError(error, "No response"), error.stack);
  } else {
    // Something happened in setting up the request that triggered an Error
    logger.error(
      formatError(error, "Request configuration error"),
      error.stack,
    );
  }

  logger.debug(error.toJSON());
}

export default logAxiosError;
