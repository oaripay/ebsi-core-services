import { IsEthereumAddress } from "class-validator";
import { ArgsRevokeVerificationMethod } from "./args-revoke-verification-method.dto.js";

export class RevokeVerificationMethodParam extends ArgsRevokeVerificationMethod {
  @IsEthereumAddress()
  from!: string;
}

export default { RevokeVerificationMethodParam };
