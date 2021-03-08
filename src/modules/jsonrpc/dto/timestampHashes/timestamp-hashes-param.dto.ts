import {
  IsEthereumAddress,
  IsInt,
  IsHexadecimal,
  Min,
  IsOptional,
} from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class TimestampHashesParam {
  @IsEthereumAddress()
  from: string;

  @IsInt({ each: true })
  @Min(0, { each: true })
  hashAlgorithmIds: number[];

  @IsHexadecimal({ each: true })
  hashValues: string[];

  @IsOptional()
  @IsHexadecimalJSON({ each: true })
  timestampData: string[];
}

export default { TimestampHashesParam };
