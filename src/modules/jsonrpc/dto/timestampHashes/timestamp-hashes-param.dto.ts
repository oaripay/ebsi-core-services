import { IsEthereumAddress, IsInt, IsHexadecimal } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class TimestampHashesParam {
  @IsEthereumAddress()
  from: string;

  @IsInt({ each: true })
  hashAlgorithmIds: number[];

  @IsHexadecimal({ each: true })
  hashValues: string[];

  @IsHexadecimalJSON({ each: true })
  timestampData: string[];
}

export default { TimestampHashesParam };
