import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsSetAttributeData } from "../sendSignedTransaction/index.ts";

export class SetAttributeDataParam extends ArgsSetAttributeData {
  @IsEthereumAddress()
  from!: string;
}
