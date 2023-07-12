import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateSchema } from "../sendSignedTransaction";

export class UpdateSchemaParam extends ArgsUpdateSchema {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateSchemaParam };
