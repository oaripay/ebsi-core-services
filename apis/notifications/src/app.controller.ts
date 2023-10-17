import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  // TODO: decide what to return
  @Get()
  root(): string {
    return "ok";
  }
}

export default AppController;
