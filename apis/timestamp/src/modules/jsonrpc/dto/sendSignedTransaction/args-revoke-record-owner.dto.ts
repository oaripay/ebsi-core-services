import { IsHexadecimal, IsString } from "class-validator";

export class ArgsRevokeRecordOwner {
  @IsHexadecimal()
  recordId!: string;

  @IsString()
  ownerId!: string;
}

export default { ArgsRevokeRecordOwner };
