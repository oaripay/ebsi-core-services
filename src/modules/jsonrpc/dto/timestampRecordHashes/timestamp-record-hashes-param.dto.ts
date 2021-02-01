import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampRecordHashes } from "../signedTransaction";

export class TimestampRecordHashesParam extends ArgsTimestampRecordHashes {
  @IsEthereumAddress()
  from: string;
}

export default { TimestampRecordHashesParam };
