import { format, transports } from "winston";
import {
  utilities as winstonUtilities,
  WinstonModule,
  type WinstonModuleOptions,
} from "nest-winston";

export const consoleTransport = new transports.Console({
  format: format.combine(
    format.timestamp(),
    winstonUtilities.format.nestLike("Authorisation API v2"),
  ),
  handleExceptions: true,
});

export const loggerOptions = {
  transports: [consoleTransport],
} satisfies WinstonModuleOptions;

export const createLogger = (customLoggerOptions?: WinstonModuleOptions) => {
  return WinstonModule.createLogger({
    ...loggerOptions,
    ...customLoggerOptions,
  });
};
