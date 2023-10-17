import { IsEthereumAddress } from "class-validator";
import { ArgsExpireVerificationMethod } from "./args-expire-verification-method.dto.js";

export class ExpireVerificationMethodParam extends ArgsExpireVerificationMethod {
  @IsEthereumAddress()
  from!: string;
}

export default { ExpireVerificationMethodParam };
