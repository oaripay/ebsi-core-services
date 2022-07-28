import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { InsertAppPublicKeyParam } from "./insert-app-public-key-param.dto";

export class RequestInsertAppPublicKeyDto extends JsonRpcDto {
  @Equals("insertAppPublicKey")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertAppPublicKeyParam)
  params: InsertAppPublicKeyParam[];
}

export default RequestInsertAppPublicKeyDto;
