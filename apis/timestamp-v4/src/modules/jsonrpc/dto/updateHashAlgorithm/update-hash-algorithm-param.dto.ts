import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateHashAlgorithm } from "../sendSignedTransaction/index.js";

export class UpdateHashAlgorithmParam extends ArgsUpdateHashAlgorithm {
  @IsEthereumAddress()
  from!: string;
}

export default { UpdateHashAlgorithmParam };
