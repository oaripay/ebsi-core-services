import { IsInt, IsHexadecimal } from "class-validator";

export class ArgsTimestampRecordHashes {
  @IsInt({ each: true })
  hashAlgorithmIds: number[];

  @IsHexadecimal({ each: true })
  hashValues: string[];

  @IsHexadecimal({ each: true })
  timestampData: string[];

  @IsHexadecimal()
  versionInfo: string;
}

export default { ArgsTimestampRecordHashes };
