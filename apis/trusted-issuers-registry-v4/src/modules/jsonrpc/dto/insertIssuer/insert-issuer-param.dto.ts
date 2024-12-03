import { IsEthereumAddress } from "class-validator";

import { ArgsInsertIssuer } from "../sendSignedTransaction/index.js";

export class InsertIssuerParam extends ArgsInsertIssuer {
  @IsEthereumAddress()
  from!: string;
}

export default { InsertIssuerParam };
