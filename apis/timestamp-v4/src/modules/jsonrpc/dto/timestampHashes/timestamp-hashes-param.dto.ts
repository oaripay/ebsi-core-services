import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampHashes } from "../sendSignedTransaction";

export class TimestampHashesParam extends ArgsTimestampHashes {
  @IsEthereumAddress()
  from!: string;
}

export default { TimestampHashesParam };
