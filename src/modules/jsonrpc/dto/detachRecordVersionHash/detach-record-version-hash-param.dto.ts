import { IsEthereumAddress } from "class-validator";
import { ArgsDetachRecordVersionHash } from "../sendSignedTransaction";

export class DetachRecordVersionHashParam extends ArgsDetachRecordVersionHash {
  @IsEthereumAddress()
  from: string;
}

export default { DetachRecordVersionHashParam };
