import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateAuthorization } from "../sendSignedTransaction";

export class UpdateAuthorizationParam extends ArgsUpdateAuthorization {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateAuthorizationParam };
