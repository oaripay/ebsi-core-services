import { Controller, Get } from "@nestjs/common";

@Controller()
export default class AppController {
  @Get("/health")
  health(): string {
    return "ok";
  }
}
