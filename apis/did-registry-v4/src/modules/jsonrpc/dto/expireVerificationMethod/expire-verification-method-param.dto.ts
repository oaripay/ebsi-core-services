import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsExpireVerificationMethod } from "./args-expire-verification-method.dto.ts";

export class ExpireVerificationMethodParam extends ArgsExpireVerificationMethod {
  @IsEthereumAddress()
  from!: string;
}
