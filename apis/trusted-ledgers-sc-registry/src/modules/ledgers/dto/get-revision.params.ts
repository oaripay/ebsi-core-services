import { IsHexadecimal } from "class-validator";
import { GetLedgerParams } from "./get-ledger.params";

export class GetRevisionParams extends GetLedgerParams {
  @IsHexadecimal()
  revisionHash: string;
}

export default GetRevisionParams;
