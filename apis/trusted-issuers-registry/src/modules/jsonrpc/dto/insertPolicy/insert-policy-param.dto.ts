import { IsEthereumAddress } from "class-validator";
import { ArgsInsertPolicy } from "../sendSignedTransaction/index.js";

export class InsertPolicyParam extends ArgsInsertPolicy {
  @IsEthereumAddress()
  from!: string;
}

export default InsertPolicyParam;
