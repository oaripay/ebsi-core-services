import { IsEthereumAddress } from "class-validator";

import { ArgsAddVerificationMethod } from "./args-add-verification-method.dto.js";

export class AddVerificationMethodParam extends ArgsAddVerificationMethod {
  @IsEthereumAddress()
  from!: string;
}

export default { AddVerificationMethodParam };
