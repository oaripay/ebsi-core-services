import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateMetadata } from "../signedTransaction";

export class UpdateMetadataParam extends ArgsUpdateMetadata {
  @IsEthereumAddress()
  from: string;
}

export default { UpdateMetadataParam };
