import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { RevokeRecordOwnerParam } from "./revoke-record-owner-param.dto.js";

export class RequestRevokeRecordOwnerDto extends JsonRpcDto {
  @Equals("revokeRecordOwner")
  declare method: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => RevokeRecordOwnerParam)
  declare params: RevokeRecordOwnerParam[];
}

export default RequestRevokeRecordOwnerDto;
