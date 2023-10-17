import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { UpdateAppPublicKeyParam } from "./update-app-public-key-param.dto.js";

export class RequestUpdateAppPublicKeyDto extends JsonRpcDto {
  @Equals("updateAppPublicKey")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateAppPublicKeyParam)
  declare params: UpdateAppPublicKeyParam[];
}

export default RequestUpdateAppPublicKeyDto;
