import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { RevokeRecordOwnerParam } from "./revoke-record-owner-param.dto";

export class RequestRevokeRecordOwnerDto extends JsonRpcDto {
  @Equals("revokeRecordOwner")
  method: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => RevokeRecordOwnerParam)
  params: RevokeRecordOwnerParam[];
}

export default RequestRevokeRecordOwnerDto;
