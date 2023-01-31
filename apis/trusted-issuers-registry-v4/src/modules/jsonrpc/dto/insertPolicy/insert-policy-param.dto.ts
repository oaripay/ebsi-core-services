import { IsEthereumAddress } from "class-validator";
import { ArgsInsertPolicy } from "../sendSignedTransaction";

export class InsertPolicyParam extends ArgsInsertPolicy {
  @IsEthereumAddress()
  from: string;
}

export default InsertPolicyParam;
