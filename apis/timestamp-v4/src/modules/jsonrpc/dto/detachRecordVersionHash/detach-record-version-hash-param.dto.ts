import { IsEthereumAddress } from "class-validator";
import { ArgsDetachRecordVersionHash } from "../sendSignedTransaction/index.js";

export class DetachRecordVersionHashParam extends ArgsDetachRecordVersionHash {
  @IsEthereumAddress()
  from!: string;
}

export default { DetachRecordVersionHashParam };
