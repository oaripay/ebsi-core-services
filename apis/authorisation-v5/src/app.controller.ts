import { Controller, Get } from "@nestjs/common";
import { Log } from "@ebsiint-api/shared";

@Controller()
export class AppController {
  @Log({ logRequest: false })
  @Get()
  root(): string {
    return "ok";
  }
}

export default AppController;
