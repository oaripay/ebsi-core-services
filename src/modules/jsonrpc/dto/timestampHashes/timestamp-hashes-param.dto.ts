import { IsEthereumAddress, IsInt, IsHexadecimal } from "class-validator";

export class TimestampHashesParam {
  @IsEthereumAddress()
  from: string;

  @IsInt({ each: true })
  hashAlgorithmIds: number[];

  @IsHexadecimal({ each: true })
  hashValues: string[];

  @IsHexadecimal({ each: true })
  timestampData: string[];
}

export default { TimestampHashesParam };
