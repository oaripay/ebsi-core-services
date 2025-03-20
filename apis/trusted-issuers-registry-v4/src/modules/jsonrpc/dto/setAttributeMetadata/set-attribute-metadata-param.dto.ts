import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsSetAttributeMetadata } from "../sendSignedTransaction/index.ts";

export class SetAttributeMetadataParam extends ArgsSetAttributeMetadata {
  @IsEthereumAddress()
  from!: string;
}
