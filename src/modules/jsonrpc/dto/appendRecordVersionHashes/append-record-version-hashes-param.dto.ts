import { IsEthereumAddress } from "class-validator";
import { ArgsAppendRecordVersionHashes } from "../signedTransaction";

export class AppendRecordVersionHashesParam extends ArgsAppendRecordVersionHashes {
  @IsEthereumAddress()
  from: string;
}

export default { AppendRecordVersionHashesParam };
