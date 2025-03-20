import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsRevokeVerificationMethod } from "./args-revoke-verification-method.dto.ts";

export class RevokeVerificationMethodParam extends ArgsRevokeVerificationMethod {
  @IsEthereumAddress()
  from!: string;
}
