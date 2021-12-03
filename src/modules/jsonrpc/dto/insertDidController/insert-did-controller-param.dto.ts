import { IsEthereumAddress } from "class-validator";
import { ArgsInsertDidController } from "../sendSignedTransaction";

export class InsertDidControllerParam extends ArgsInsertDidController {
  @IsEthereumAddress()
  from: string;
}

export default { InsertDidControllerParam };
