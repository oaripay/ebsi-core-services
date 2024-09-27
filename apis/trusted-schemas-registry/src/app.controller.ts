import { Log } from "@ebsiint-api/shared";
import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Log({ logRequest: false })
  @Get()
  root(): string {
    return "ok";
  }
}

export default AppController;
