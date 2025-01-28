import type { WinstonModuleOptions } from "nest-winston";

import { WinstonModule, utilities as winstonUtilities } from "nest-winston";
import { format, transports } from "winston";

export const consoleTransport = new transports.Console({
  format: format.combine(
    format.timestamp(),
    winstonUtilities.format.nestLike("Timestamp API v5"),
  ),
  handleExceptions: true,
});

export const loggerOptions = {
  transports: [consoleTransport],
};

export const createLogger = (customLoggerOptions?: WinstonModuleOptions) => {
  return WinstonModule.createLogger({
    ...loggerOptions,
    ...customLoggerOptions,
  });
};
