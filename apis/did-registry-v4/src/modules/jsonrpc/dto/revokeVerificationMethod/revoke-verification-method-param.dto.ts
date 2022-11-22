import { IsEthereumAddress } from "class-validator";
import { ArgsRevokeVerificationMethod } from "./args-revoke-verification-method.dto";

export class RevokeVerificationMethodParam extends ArgsRevokeVerificationMethod {
  @IsEthereumAddress()
  from: string;
}

export default { RevokeVerificationMethodParam };
