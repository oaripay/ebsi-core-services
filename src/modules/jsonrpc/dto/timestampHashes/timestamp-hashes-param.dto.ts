import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampHashes } from "../signedTransaction";

export class TimestampHashesParam extends ArgsTimestampHashes {
  @IsEthereumAddress()
  from: string;
}

export default { TimestampHashesParam };
