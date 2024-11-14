import { Accepts, Log } from "@ebsiint-api/shared";
import { PolicyRegistry__factory } from "@ebsiint-sc/trusted-policies-registry-v3";
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
    return PolicyRegistry__factory.abi;
  }
}

export default AppController;
