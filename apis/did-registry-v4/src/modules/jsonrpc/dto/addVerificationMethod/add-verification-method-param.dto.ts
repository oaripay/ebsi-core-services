import { IsEthereumAddress } from "class-validator";

import { ArgsAddVerificationMethod } from "./args-add-verification-method.dto.ts";

export class AddVerificationMethodParam extends ArgsAddVerificationMethod {
  @IsEthereumAddress()
  from!: string;
}
