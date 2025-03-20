import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsRevokeController } from "./args-revoke-controller.dto.ts";

export class RevokeControllerParam extends ArgsRevokeController {
  @IsEthereumAddress()
  from!: string;
}
