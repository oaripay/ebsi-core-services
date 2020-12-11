import { Controller, Get, Logger } from "@nestjs/common";

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  @Get()
  root(): string {
    return "ok";
  }

  @Get("/log-info")
  logInfo(): string {
    this.logger.log("Info message");
    return "ok";
  }

  @Get("/log-error")
  logError(): string {
    const error = new Error("Example error");
    this.logger.error(error.message, error.stack);
    return "ok";
  }

  @Get("/error")
  errorExample(): string {
    throw new Error("unhandled error !");
  }
}

export default AppController;
