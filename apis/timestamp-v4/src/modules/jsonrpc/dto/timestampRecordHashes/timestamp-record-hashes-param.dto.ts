import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampRecordHashes } from "../sendSignedTransaction/index.js";

export class TimestampRecordHashesParam extends ArgsTimestampRecordHashes {
  @IsEthereumAddress()
  from!: string;
}

export default { TimestampRecordHashesParam };
