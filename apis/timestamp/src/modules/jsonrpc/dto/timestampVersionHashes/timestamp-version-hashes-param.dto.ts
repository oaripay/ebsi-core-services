import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampVersionHashes } from "../sendSignedTransaction/index.js";

export class TimestampVersionHashesParam extends ArgsTimestampVersionHashes {
  @IsEthereumAddress()
  from!: string;
}

export default { TimestampVersionHashesParam };
