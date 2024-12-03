import { IsEthereumAddress } from "class-validator";

import { ArgsSetAttributeData } from "../sendSignedTransaction/index.js";

export class SetAttributeDataParam extends ArgsSetAttributeData {
  @IsEthereumAddress()
  from!: string;
}

export default SetAttributeDataParam;
