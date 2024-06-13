import type { Logger } from "@nestjs/common";
import axios from "axios";

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
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    if (!error.status || error.status >= minErrorStatus) {
      logger.error(
        {
          config: error.config,
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers,
        },
        error.stack,
      );
    } else {
      logger.log(
        {
          config: error.config,
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers,
        },
        error.stack,
      );
    }
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    logger.error(
      {
        config: error.config,
        request: error.request as unknown,
      },
      error.stack,
    );
  } else {
    // Something happened in setting up the request that triggered an Error
    logger.error(
      {
        config: error.config,
        message: error.message,
      },
      error.stack,
    );
  }

  logger.debug(error.toJSON());
}

export default logAxiosError;
