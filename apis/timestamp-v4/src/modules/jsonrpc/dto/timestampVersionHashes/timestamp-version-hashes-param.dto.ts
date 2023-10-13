import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampVersionHashes } from "../sendSignedTransaction";

export class TimestampVersionHashesParam extends ArgsTimestampVersionHashes {
  @IsEthereumAddress()
  from!: string;
}

export default { TimestampVersionHashesParam };
