import { IsEthereumAddress } from "class-validator";

import { ArgsUpdateIssuer } from "../sendSignedTransaction/index.ts";

export class UpdateIssuerParam extends ArgsUpdateIssuer {
  @IsEthereumAddress()
  from!: string;
}
