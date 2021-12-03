import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateDidMethod } from "../sendSignedTransaction";

export class UpdateDidMethodParam extends ArgsUpdateDidMethod {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateDidMethodParam };
