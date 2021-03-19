import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateHashAlgorithm } from "../signedTransaction";

export class UpdateHashAlgorithmParam extends ArgsUpdateHashAlgorithm {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateHashAlgorithmParam };
