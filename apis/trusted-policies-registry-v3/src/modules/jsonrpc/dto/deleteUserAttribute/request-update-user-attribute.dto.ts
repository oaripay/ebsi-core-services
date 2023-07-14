import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { DeleteUserAttributeParam } from "./update-user-attribute-param.dto";

export class RequestDeleteUserAttributeDto extends JsonRpcDto {
  @Equals("deleteUserAttribute")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => DeleteUserAttributeParam)
  params: DeleteUserAttributeParam[];
}

export default RequestDeleteUserAttributeDto;
