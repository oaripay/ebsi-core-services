import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateAuthorization } from "../sendSignedTransaction/index.js";

export class UpdateAuthorizationParam extends ArgsUpdateAuthorization {
  @IsEthereumAddress()
  from!: string;
}

export default { UpdateAuthorizationParam };
