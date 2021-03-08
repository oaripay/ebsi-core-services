import { IsEthereumAddress } from "class-validator";
import { ArgsInsertSchema } from "../signedTransaction";

export class InsertSchemaParam extends ArgsInsertSchema {
  @IsEthereumAddress()
  from: string;
}

export default { InsertSchemaParam };
