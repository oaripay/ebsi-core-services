import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateHashAlgorithm } from "../sendSignedTransaction";

export class UpdateHashAlgorithmParam extends ArgsUpdateHashAlgorithm {
  @IsEthereumAddress()
  from!: string;
}

export default { UpdateHashAlgorithmParam };
