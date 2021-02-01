import { IsEthereumAddress } from "class-validator";
import { ArgsDetachRecordVersionHash } from "../signedTransaction";

export class DetachRecordVersionHashParam extends ArgsDetachRecordVersionHash {
  @IsEthereumAddress()
  from: string;
}

export default { DetachRecordVersionHashParam };
