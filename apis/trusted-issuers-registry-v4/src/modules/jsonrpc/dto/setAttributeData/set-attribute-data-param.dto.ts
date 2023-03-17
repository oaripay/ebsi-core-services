import { IsEthereumAddress } from "class-validator";
import { ArgsSetAttributeData } from "../sendSignedTransaction";

export class SetAttributeDataParam extends ArgsSetAttributeData {
  @IsEthereumAddress()
  from!: string;
}

export default SetAttributeDataParam;
