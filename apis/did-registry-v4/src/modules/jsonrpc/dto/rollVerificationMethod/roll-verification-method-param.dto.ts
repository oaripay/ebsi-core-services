import { IsEthereumAddress } from "class-validator";
import { ArgsRollVerificationMethod } from "./args-roll-verification-method.dto.js";

export class RollVerificationMethodParam extends ArgsRollVerificationMethod {
  @IsEthereumAddress()
  from!: string;
}

export default { RollVerificationMethodParam };
