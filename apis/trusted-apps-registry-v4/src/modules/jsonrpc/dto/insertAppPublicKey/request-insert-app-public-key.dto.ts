import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertAppPublicKeyParam } from "./insert-app-public-key-param.dto.js";

export class RequestInsertAppPublicKeyDto extends JsonRpcDto {
  @Equals("insertAppPublicKey")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertAppPublicKeyParam)
  declare params: InsertAppPublicKeyParam[];
}

export default RequestInsertAppPublicKeyDto;
