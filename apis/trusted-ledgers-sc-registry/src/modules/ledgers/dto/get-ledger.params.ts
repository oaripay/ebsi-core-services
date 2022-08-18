import { IsHexadecimal } from "class-validator";

export class GetLedgerParams {
  @IsHexadecimal()
  ledgerInfoId: string;
}

export default GetLedgerParams;
