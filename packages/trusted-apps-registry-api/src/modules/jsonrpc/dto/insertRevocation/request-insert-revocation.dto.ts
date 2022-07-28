import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertRevocationParam } from "./insert-revocation-param.dto";

export class RequestInsertRevocationDto extends JsonRpcDto {
  @Equals("insertRevocation")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertRevocationParam)
  params: InsertRevocationParam[];
}

export default RequestInsertRevocationDto;
