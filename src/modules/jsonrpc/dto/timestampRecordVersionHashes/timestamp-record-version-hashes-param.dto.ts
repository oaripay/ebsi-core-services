import { IsEthereumAddress } from "class-validator";
import { ArgsTimestampRecordVersionHashes } from "../signedTransaction";

export class TimestampRecordVersionHashesParam extends ArgsTimestampRecordVersionHashes {
  @IsEthereumAddress()
  from: string;
}

export default { TimestampRecordVersionHashesParam };
