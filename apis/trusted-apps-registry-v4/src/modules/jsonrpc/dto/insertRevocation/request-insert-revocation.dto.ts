import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertRevocationParam } from "./insert-revocation-param.dto.js";

export class RequestInsertRevocationDto extends JsonRpcDto {
  @Equals("insertRevocation")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertRevocationParam)
  declare params: InsertRevocationParam[];
}

export default RequestInsertRevocationDto;
