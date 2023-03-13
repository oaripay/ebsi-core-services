import { IsEthereumAddress } from "class-validator";
import { ArgsRevokeController } from "./args-revoke-controller.dto";

export class RevokeControllerParam extends ArgsRevokeController {
  @IsEthereumAddress()
  from!: string;
}

export default { RevokeControllerParam };
