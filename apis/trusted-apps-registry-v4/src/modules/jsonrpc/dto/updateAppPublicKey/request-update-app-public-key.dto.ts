import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateAppPublicKeyParam } from "./update-app-public-key-param.dto";

export class RequestUpdateAppPublicKeyDto extends JsonRpcDto {
  @Equals("updateAppPublicKey")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateAppPublicKeyParam)
  params: UpdateAppPublicKeyParam[];
}

export default RequestUpdateAppPublicKeyDto;
