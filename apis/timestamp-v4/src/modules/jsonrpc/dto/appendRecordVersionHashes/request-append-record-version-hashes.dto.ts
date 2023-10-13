import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { AppendRecordVersionHashesParam } from "./append-record-version-hashes-param.dto";

export class RequestAppendRecordVersionHashesDto extends JsonRpcDto {
  @Equals("appendRecordVersionHashes")
  method!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => AppendRecordVersionHashesParam)
  params!: AppendRecordVersionHashesParam[];
}

export default RequestAppendRecordVersionHashesDto;
