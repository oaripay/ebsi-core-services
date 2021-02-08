import { IsInt, IsHexadecimal } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsAppendRecordVersionHashes {
  @IsHexadecimal()
  recordId: string;

  @IsInt()
  versionId: number;

  @IsInt({ each: true })
  hashAlgorithmIds: number[];

  @IsHexadecimal({ each: true })
  hashValues: string[];

  @IsHexadecimalJSON({ each: true })
  timestampData: string[];

  @IsHexadecimalJSON()
  versionInfo: string;
}

export default { ArgsAppendRecordVersionHashes };
