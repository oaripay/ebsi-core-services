import { IsEthereumAddress } from "class-validator";
import { ArgsRevokeRecordOwner } from "../sendSignedTransaction";

export class RevokeRecordOwnerParam extends ArgsRevokeRecordOwner {
  @IsEthereumAddress()
  from!: string;
}

export default { RevokeRecordOwnerParam };
