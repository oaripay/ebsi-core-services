import { IsEthereumAddress } from "class-validator";
import { ArgsInsertHashAlgorithm } from "../signedTransaction";

export class InsertHashAlgorithmParam extends ArgsInsertHashAlgorithm {
  @IsEthereumAddress()
  from: string;
}

export default { InsertHashAlgorithmParam };
