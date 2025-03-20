import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsAddVerificationMethod } from "./args-add-verification-method.dto.ts";

export class AddVerificationMethodParam extends ArgsAddVerificationMethod {
  @IsEthereumAddress()
  from!: string;
}
