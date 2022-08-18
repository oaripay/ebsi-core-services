import { IsEthereumAddress } from "class-validator";
import { ArgsInsertHashAlgorithm } from "../sendSignedTransaction";

export class InsertHashAlgorithmParam extends ArgsInsertHashAlgorithm {
  @IsEthereumAddress()
  from: string;
}

export default { InsertHashAlgorithmParam };
