import { IsEthereumAddress } from "class-validator";
import { ArgsSetAttributeMetadata } from "../sendSignedTransaction";

export class SetAttributeMetadataParam extends ArgsSetAttributeMetadata {
  @IsEthereumAddress()
  from!: string;
}

export default SetAttributeMetadataParam;
