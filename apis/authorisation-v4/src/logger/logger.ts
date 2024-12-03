import {
  WinstonModule,
  type WinstonModuleOptions,
  utilities as winstonUtilities,
} from "nest-winston";
import { format, transports } from "winston";

export const consoleTransport = new transports.Console({
  format: format.combine(
    format.timestamp(),
    winstonUtilities.format.nestLike("Authorisation API v4"),
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
