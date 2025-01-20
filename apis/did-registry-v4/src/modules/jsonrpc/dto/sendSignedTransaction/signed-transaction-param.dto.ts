import { IsSignedRawTransaction } from "@ebsiint-api/shared";
import { Type } from "class-transformer";
import { Contains, Equals, ValidateNested } from "class-validator";

import { UnsignedTransaction } from "./unsigned-transaction.dto.js";

export class SignedTransactionParam {
  @Equals("eth")
  protocol!: "eth";

  @ValidateNested()
  @Type(() => UnsignedTransaction)
  unsignedTransaction!: UnsignedTransaction;

  @Contains("0x")
  r!: string;

  @Contains("0x")
  s!: string;

  @Contains("0x")
  v!: string;

  @IsSignedRawTransaction()
  signedRawTransaction!: string;
}

export default { SignedTransactionParam };
