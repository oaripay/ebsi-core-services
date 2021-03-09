import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateSchema } from "../signedTransaction";

export class UpdateSchemaParam extends ArgsUpdateSchema {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateSchemaParam };
