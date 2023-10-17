import { IsEthereumAddress } from "class-validator";
import { ArgsInsertSchema } from "../sendSignedTransaction/index.js";

export class InsertSchemaParam extends ArgsInsertSchema {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertSchemaParam };
