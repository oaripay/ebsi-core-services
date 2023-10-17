import type { LoggerService } from "@nestjs/common";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

interface AxiosResponseError {
  config?: AxiosRequestConfig;
  response?: AxiosResponse;
}

const isNotFoundError = (data?: unknown): boolean => {
  if (!data || typeof data !== "object" || data === null) return false;

  return "title" in data && "status" in data && data.status === 404;
};

const validateRequestConfigHeaders = (config: AxiosRequestConfig): boolean => {
  return (
    !config.headers ||
    (typeof config.headers === "object" &&
      config.headers["EBSI-REMOTE-API"] !== "true")
  );
};

const errorNeedsInterception = (error: AxiosResponseError): boolean => {
  return (
    !error.response ||
    error.response.status >= 500 ||
    (error.response.status === 404 && !isNotFoundError(error.response.data))
  );
};

export function setupInterceptors(
  domain: string,
  localOrigin: string,
  logger?: LoggerService,
): void {
  if (!domain || !localOrigin) {
    // Don't define interceptors if the domain or local origin is not set
    return;
  }

  // Request interceptor
  axios.interceptors.request.use((config) => {
    if (
      validateRequestConfigHeaders(config) &&
      config.url &&
      config.url.startsWith(domain)
    ) {
      const localUrl = config.url.replace(domain, localOrigin);

      if (logger) {
        logger.verbose!(
          `Replacing ${config.url} with ${localUrl}`,
          "Axios Request Interceptor",
        );
      }

      // eslint-disable-next-line no-param-reassign
      config.url = localUrl;
    }

    return config;
  }, null);

  // Response interceptor
  axios.interceptors.response.use(
    null,
    // This function is triggered whenever an axios request doesn't return a 2xx
    (error: AxiosResponseError) => {
      if (
        errorNeedsInterception(error) &&
        error.config?.url?.startsWith(localOrigin)
      ) {
        const { config } = error;

        const remoteUrl = config.url!.replace(localOrigin, domain);

        if (logger) {
          logger.debug!(error, "Axios Response Interceptor");
          logger.verbose!(
            `Replacing ${config.url} with ${remoteUrl}`,
            "Axios Response Interceptor",
          );
        }

        // Replace local URL with remote
        config.url = remoteUrl;

        // Add custom header to avoid replacing the URL again
        (config.headers as { [x: string]: unknown })["EBSI-REMOTE-API"] =
          "true";

        // Retry request
        return axios.request(config);
      }

      return Promise.reject(error);
    },
  );
}

export default setupInterceptors;
