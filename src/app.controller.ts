import { Controller, Get, Logger } from "@nestjs/common";

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  // TODO: decide what to return
  @Get()
  root(): string {
    return "ok";
  }
}

export default AppController;
