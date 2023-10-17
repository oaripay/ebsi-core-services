import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampRecordVersionHashes } from "../sendSignedTransaction/index.js";

export class TimestampRecordVersionHashesParam extends ArgsTimestampRecordVersionHashes {
  @IsEthereumAddress()
  from!: string;
}

export default { TimestampRecordVersionHashesParam };
