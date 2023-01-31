import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertIssuerParam } from "./insert-issuer-param.dto";

export class RequestInsertIssuerDto extends JsonRpcDto {
  @Equals("insertIssuer")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertIssuerParam)
  params: InsertIssuerParam[];
}

export default RequestInsertIssuerDto;
