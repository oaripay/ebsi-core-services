import { IsEthereumAddress } from "class-validator";

import { ArgsSetAttributeMetadata } from "../sendSignedTransaction/index.ts";

export class SetAttributeMetadataParam extends ArgsSetAttributeMetadata {
  @IsEthereumAddress()
  from!: string;
}
