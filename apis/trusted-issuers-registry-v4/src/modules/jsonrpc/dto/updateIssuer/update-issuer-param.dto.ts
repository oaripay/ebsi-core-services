import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsUpdateIssuer } from "../sendSignedTransaction/index.ts";

export class UpdateIssuerParam extends ArgsUpdateIssuer {
  @IsEthereumAddress()
  from!: string;
}
