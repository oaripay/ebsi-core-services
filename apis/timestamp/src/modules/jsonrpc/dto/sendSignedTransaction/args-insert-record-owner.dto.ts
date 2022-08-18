import { IsInt, IsHexadecimal, IsString, Min } from "class-validator";

export class ArgsInsertRecordOwner {
  @IsHexadecimal()
  recordId: string;

  @IsString()
  ownerId: string;

  @IsInt()
  @Min(0)
  notBefore: number;

  @IsInt()
  @Min(0)
  notAfter: number;
}

export default { ArgsInsertRecordOwner };
