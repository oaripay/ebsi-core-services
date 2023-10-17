import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { SignedTransactionParam } from "./signed-transaction-param.dto.js";

export class RequestSendSignedTransactionDto extends JsonRpcDto {
  @IsIn(["sendSignedTransaction", "signedTransaction"])
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => SignedTransactionParam)
  declare params: SignedTransactionParam[];
}

export default RequestSendSignedTransactionDto;
