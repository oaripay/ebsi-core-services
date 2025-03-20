import { IsEthereumAddress } from "@ebsiint-api/shared";

import { ArgsInsertIssuer } from "../sendSignedTransaction/index.ts";

export class InsertIssuerParam extends ArgsInsertIssuer {
  @IsEthereumAddress()
  from!: string;
}
