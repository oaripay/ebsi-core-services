import { IsEthereumAddress } from "class-validator";
import { ArgsInsertSmartContractInfo } from "../sendSignedTransaction";

export class InsertSmartContractInfoParam extends ArgsInsertSmartContractInfo {
  @IsEthereumAddress()
  from: string;
}

export default { InsertSmartContractInfoParam };
