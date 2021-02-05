import { IsInt, IsHexadecimal } from "class-validator";

export class ArgsTimestampRecordVersionHashes {
  @IsHexadecimal()
  recordId: string;

  @IsInt({ each: true })
  hashAlgorithmIds: number[];

  @IsHexadecimal({ each: true })
  hashValues: string[];

  @IsHexadecimal({ each: true })
  timestampData: string[];

  @IsHexadecimal()
  versionInfo: string;
}

export default { ArgsTimestampRecordVersionHashes };
