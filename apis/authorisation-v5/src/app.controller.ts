import { Controller, Get } from "@nestjs/common";
import { Accepts, Log } from "@ebsiint-api/shared";

@Controller()
export class AppController {
  @Log({ logRequest: false })
  @Accepts("text/plain")
  @Get()
  root(): string {
    return "ok";
  }
}

export default AppController;
