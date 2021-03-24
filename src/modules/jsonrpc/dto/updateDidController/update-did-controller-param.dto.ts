import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateDidController } from "../signedTransaction";

export class UpdateDidControllerParam extends ArgsUpdateDidController {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateDidControllerParam };
