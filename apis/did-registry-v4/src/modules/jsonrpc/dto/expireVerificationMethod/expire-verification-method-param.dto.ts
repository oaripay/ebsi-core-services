import { IsEthereumAddress } from "class-validator";

import { ArgsExpireVerificationMethod } from "./args-expire-verification-method.dto.ts";

export class ExpireVerificationMethodParam extends ArgsExpireVerificationMethod {
  @IsEthereumAddress()
  from!: string;
}

export default { ExpireVerificationMethodParam };
