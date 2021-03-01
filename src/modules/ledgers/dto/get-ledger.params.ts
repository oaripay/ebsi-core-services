import { IsString, IsHexadecimal } from "class-validator";

export class GetLedgerParams {
  @IsString()
  @IsHexadecimal()
  // @Length(64, 66) // 64 = w/o "0x", 66 = w/ "0x"
  ledgerInfoId: string;
}

export default GetLedgerParams;
