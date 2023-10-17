import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateSchema } from "../sendSignedTransaction/index.js";

export class UpdateSchemaParam extends ArgsUpdateSchema {
  @IsEthereumAddress()
  from!: string;
}

export default { UpdateSchemaParam };
