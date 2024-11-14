import { Accepts, Log } from "@ebsiint-api/shared";
import { Controller, Get, HttpCode } from "@nestjs/common";
import { TrackAndTrace__factory } from "@ebsiint-sc/track-and-trace";

@Controller()
export class AppController {
  @Log({ logRequest: false })
  @Accepts("text/plain")
  @Get()
  @HttpCode(200)
  root(): string {
    return "ok";
  }

  @Log({ logRequest: false })
  @Get("/abi")
  @Accepts("application/json")
  @HttpCode(200)
  abi() {
    return TrackAndTrace__factory.abi;
  }
}

export default AppController;
