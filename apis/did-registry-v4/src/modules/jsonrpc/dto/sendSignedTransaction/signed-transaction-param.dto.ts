import { Equals, Contains, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { UnsignedTransaction } from "./unsigned-transaction.dto";

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

  @Contains("0x")
  signedRawTransaction!: string;
}

export default { SignedTransactionParam };
