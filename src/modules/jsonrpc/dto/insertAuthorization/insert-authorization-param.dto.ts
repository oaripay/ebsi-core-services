import { IsEthereumAddress } from "class-validator";
import { ArgsInsertAuthorization } from "../signedTransaction";

export class InsertAuthorizationParam extends ArgsInsertAuthorization {
  @IsEthereumAddress()
  from: string;
}

export default { InsertAuthorizationParam };
