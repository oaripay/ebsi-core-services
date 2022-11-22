import { IsEthereumAddress } from "class-validator";
import { ArgsAddVerificationMethod } from "./args-add-verification-method.dto";

export class AddVerificationMethodParam extends ArgsAddVerificationMethod {
  @IsEthereumAddress()
  from: string;
}

export default { AddVerificationMethodParam };
