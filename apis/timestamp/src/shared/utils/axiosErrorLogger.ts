import { Logger } from "@nestjs/common";
import axios from "axios";

export function logAxiosError(error: unknown, logger: Logger): void {
  if (!error || !(error instanceof Error) || !axios.isAxiosError(error)) return;

  logger.error("Axios error intercepted.", error.stack);

  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    logger.error({
      data: error.response.data,
      status: error.response.status,
      headers: error.response.headers,
    });
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    logger.error({
      request: error.request as unknown,
    });
  } else {
    // Something happened in setting up the request that triggered an Error
    logger.error({
      message: error.message,
    });
  }

  logger.error(error.toJSON());
}

export default logAxiosError;
