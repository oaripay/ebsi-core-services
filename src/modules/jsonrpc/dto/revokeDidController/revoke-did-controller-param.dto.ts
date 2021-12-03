import { IsEthereumAddress } from "class-validator";
import { ArgsRevokeDidController } from "../sendSignedTransaction";

export class RevokeDidControllerParam extends ArgsRevokeDidController {
  @IsEthereumAddress()
  from: string;
}

export default { RevokeDidControllerParam };
