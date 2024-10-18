import { Accepts, Log } from "@ebsiint-api/shared";
import { Controller, Get } from "@nestjs/common";

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
