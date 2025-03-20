import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsRollVerificationMethod } from "./args-roll-verification-method.dto.ts";

export class RollVerificationMethodParam extends ArgsRollVerificationMethod {
  @IsEthereumAddress()
  from!: string;
}
