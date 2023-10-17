import { IsEthereumAddress } from "class-validator";
import { ArgsSetAttributeMetadata } from "../sendSignedTransaction/index.js";

export class SetAttributeMetadataParam extends ArgsSetAttributeMetadata {
  @IsEthereumAddress()
  from!: string;
}

export default SetAttributeMetadataParam;
