import { IsEthereumAddress } from "class-validator";
import { ArgsInsertDidController } from "../signedTransaction";

export class InsertDidControllerParam extends ArgsInsertDidController {
  @IsEthereumAddress()
  from: string;
}

export default { InsertDidControllerParam };
