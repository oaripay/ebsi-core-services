import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateAuthorization } from "../signedTransaction";

export class UpdateAuthorizationParam extends ArgsUpdateAuthorization {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateAuthorizationParam };
