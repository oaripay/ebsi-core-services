import { IsEthereumAddress, IsInt, IsHexadecimal } from "class-validator";

export class TimestampRecordHashesParam {
  @IsEthereumAddress()
  from: string;

  @IsInt({ each: true })
  hashAlgorithmIds: number[];

  @IsHexadecimal({ each: true })
  hashValues: string[];

  @IsHexadecimal({ each: true })
  timestampData: string[];

  @IsHexadecimal()
  versionInfo: string;
}

export default { TimestampRecordHashesParam };
