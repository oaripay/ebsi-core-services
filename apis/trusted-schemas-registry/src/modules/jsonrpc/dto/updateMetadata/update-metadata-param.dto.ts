import { IsEthereumAddress } from "class-validator";
import { ArgsUpdateMetadata } from "../sendSignedTransaction/index.js";

export class UpdateMetadataParam extends ArgsUpdateMetadata {
  @IsEthereumAddress()
  from!: string;
}

export default { UpdateMetadataParam };
