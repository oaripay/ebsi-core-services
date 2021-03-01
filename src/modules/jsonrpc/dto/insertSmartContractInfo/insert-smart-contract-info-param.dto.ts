import { IsEthereumAddress } from "class-validator";
import { ArgsInsertSmartContractInfo } from "../signedTransaction";

export class InsertSmartContractInfoParam extends ArgsInsertSmartContractInfo {
  @IsEthereumAddress()
  from: string;
}

export default { InsertSmartContractInfoParam };
