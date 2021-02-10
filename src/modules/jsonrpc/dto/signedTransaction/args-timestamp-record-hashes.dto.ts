import { IsInt, Min, IsHexadecimal } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsTimestampRecordHashes {
  @IsInt({ each: true })
  @Min(0, { each: true })
  hashAlgorithmIds: number[];

  @IsHexadecimal({ each: true })
  hashValues: string[];

  @IsHexadecimalJSON({ each: true })
  timestampData: string[];

  @IsHexadecimalJSON()
  versionInfo: string;
}

export default { ArgsTimestampRecordHashes };
