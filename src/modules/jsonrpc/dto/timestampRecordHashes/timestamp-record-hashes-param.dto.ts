import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampRecordHashes } from "../sendSignedTransaction";

export class TimestampRecordHashesParam extends ArgsTimestampRecordHashes {
  @IsEthereumAddress()
  from: string;
}

export default { TimestampRecordHashesParam };
