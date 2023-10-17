import { IsEthereumAddress } from "class-validator";
import { ArgsInsertDidController } from "../sendSignedTransaction/index.js";

export class InsertDidControllerParam extends ArgsInsertDidController {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertDidControllerParam };
