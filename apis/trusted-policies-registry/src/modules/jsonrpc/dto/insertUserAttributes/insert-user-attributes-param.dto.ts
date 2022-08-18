import { IsEthereumAddress } from "class-validator";
import { ArgsInsertUserAttributes } from "../sendSignedTransaction";

export class InsertUserAttributesParam extends ArgsInsertUserAttributes {
  @IsEthereumAddress()
  from: string;
}

export default { InsertUserAttributesParam };
