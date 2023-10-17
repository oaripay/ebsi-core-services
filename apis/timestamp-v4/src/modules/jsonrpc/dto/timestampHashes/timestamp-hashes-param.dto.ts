import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampHashes } from "../sendSignedTransaction/index.js";

export class TimestampHashesParam extends ArgsTimestampHashes {
  @IsEthereumAddress()
  from!: string;
}

export default { TimestampHashesParam };
