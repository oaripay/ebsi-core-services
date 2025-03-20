import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsAddController } from "./args-add-controller.dto.ts";

export class AddControllerParam extends ArgsAddController {
  @IsEthereumAddress()
  from!: string;
}
