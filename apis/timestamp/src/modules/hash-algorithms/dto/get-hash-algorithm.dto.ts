import { IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

export class GetHashAlgorithmDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number) // We receive a string (in the URL), we must convert it to Number
  hashAlgorithmId!: string;
}

export default GetHashAlgorithmDto;
