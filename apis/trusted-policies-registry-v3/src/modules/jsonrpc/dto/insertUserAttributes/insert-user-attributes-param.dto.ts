import { IsEthereumAddress } from "class-validator";
import { ArgsInsertUserAttributes } from "../sendSignedTransaction/index.js";

export class InsertUserAttributesParam extends ArgsInsertUserAttributes {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertUserAttributesParam };
