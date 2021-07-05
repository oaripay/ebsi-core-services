import { IsEthereumAddress } from "class-validator";
import { ArgsInsertPolicy } from "../signedTransaction";

export class InsertPolicyParam extends ArgsInsertPolicy {
  @IsEthereumAddress()
  from: string;
}

export default InsertPolicyParam;
