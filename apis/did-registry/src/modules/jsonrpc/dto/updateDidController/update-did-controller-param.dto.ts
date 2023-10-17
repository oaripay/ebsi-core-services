import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateDidController } from "../sendSignedTransaction/index.js";

export class UpdateDidControllerParam extends ArgsUpdateDidController {
  @IsEthereumAddress()
  from!: string;
}

export default { UpdateDidControllerParam };
