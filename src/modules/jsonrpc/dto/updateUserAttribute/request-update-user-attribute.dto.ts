import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { UpdateUserAttributeParam } from "./update-user-attribute-param.dto";

export class RequestUpdateUserAttributeDto extends JsonRpcDto {
  @Equals("updateUserAttribute")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => UpdateUserAttributeParam)
  params: UpdateUserAttributeParam[];
}

export default RequestUpdateUserAttributeDto;
