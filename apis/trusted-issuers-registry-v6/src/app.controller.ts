import { Accepts, Log } from "@ebsiint-api/shared";
import { TrustedIssuersRegistry__factory } from "@ebsiint-sc/trusted-issuers-registry-v4";
import { Controller, Get, HttpCode } from "@nestjs/common";

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
    return TrustedIssuersRegistry__factory.abi;
  }
}

export default AppController;
