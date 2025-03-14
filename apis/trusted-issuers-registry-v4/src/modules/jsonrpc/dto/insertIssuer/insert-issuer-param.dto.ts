import { IsEthereumAddress } from "class-validator";

import { ArgsInsertIssuer } from "../sendSignedTransaction/index.ts";

export class InsertIssuerParam extends ArgsInsertIssuer {
  @IsEthereumAddress()
  from!: string;
}
