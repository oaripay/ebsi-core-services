import { IsEthereumAddress } from "class-validator";
import { ArgsInsertAuthorization } from "../sendSignedTransaction/index.js";

export class InsertAuthorizationParam extends ArgsInsertAuthorization {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertAuthorizationParam };
