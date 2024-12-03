import { Accepts, Log } from "@ebsiint-api/shared";
import { TrustedIssuersRegistry__factory } from "@ebsiint-sc/trusted-issuers-registry-v4";
import { Controller, Get, HttpCode } from "@nestjs/common";

@Controller()
export class AppController {
  @Accepts("application/json")
  @Get("/abi")
  @HttpCode(200)
  @Log({ logRequest: false })
  abi() {
    return TrustedIssuersRegistry__factory.abi;
  }

  @Accepts("text/plain")
  @Get()
  @HttpCode(200)
  @Log({ logRequest: false })
  root(): string {
    return "ok";
  }
}

export default AppController;
