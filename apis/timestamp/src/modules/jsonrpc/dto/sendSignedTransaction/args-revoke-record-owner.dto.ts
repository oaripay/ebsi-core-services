import { IsHexadecimal, IsString, Matches } from "class-validator";

export class ArgsRevokeRecordOwner {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  recordId!: string;

  @IsString()
  ownerId!: string;
}

export default { ArgsRevokeRecordOwner };
