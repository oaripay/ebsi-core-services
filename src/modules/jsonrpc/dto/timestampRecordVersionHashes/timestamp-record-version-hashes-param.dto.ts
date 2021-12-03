import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampRecordVersionHashes } from "../sendSignedTransaction";

export class TimestampRecordVersionHashesParam extends ArgsTimestampRecordVersionHashes {
  @IsEthereumAddress()
  from: string;
}

export default { TimestampRecordVersionHashesParam };
