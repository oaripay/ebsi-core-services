import { format, transports } from "winston";
import { utilities as winstonUtilities, WinstonModule } from "nest-winston";
import type { LoggerService } from "@nestjs/common";

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

export const createLogger = (): LoggerService => {
  return WinstonModule.createLogger(loggerOptions);
};
