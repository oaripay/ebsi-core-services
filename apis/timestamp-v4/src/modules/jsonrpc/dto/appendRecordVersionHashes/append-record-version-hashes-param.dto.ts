import { IsEthereumAddress } from "class-validator";
import { ArgsAppendRecordVersionHashes } from "../sendSignedTransaction";

export class AppendRecordVersionHashesParam extends ArgsAppendRecordVersionHashes {
  @IsEthereumAddress()
  from!: string;
}

export default { AppendRecordVersionHashesParam };
