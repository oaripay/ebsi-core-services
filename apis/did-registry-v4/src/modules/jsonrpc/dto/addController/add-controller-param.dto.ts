import { IsEthereumAddress } from "class-validator";

import { ArgsAddController } from "./args-add-controller.dto.js";

export class AddControllerParam extends ArgsAddController {
  @IsEthereumAddress()
  from!: string;
}

export default { AddControllerParam };
