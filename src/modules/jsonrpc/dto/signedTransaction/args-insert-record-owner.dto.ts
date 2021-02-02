import { IsInt, IsHexadecimal, IsString } from "class-validator";

export class ArgsInsertRecordOwner {
  @IsHexadecimal()
  recordId: string;

  @IsString()
  ownerId: string;

  @IsInt()
  notBefore: number;

  @IsInt()
  notAfter: number;
}

export default { ArgsInsertRecordOwner };
