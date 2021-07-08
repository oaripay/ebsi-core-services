import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampVersionHashes } from "../signedTransaction";

export class TimestampVersionHashesParam extends ArgsTimestampVersionHashes {
  @IsEthereumAddress()
  from: string;
}

export default { TimestampVersionHashesParam };
