import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { SignedTransactionParam } from "./signed-transaction-param.dto.js";
import { JsonRpcDto } from "../jsonrpc.dto.js";

export class RequestSendSignedTransactionDto extends JsonRpcDto {
  @Equals("sendSignedTransaction")
  declare method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => SignedTransactionParam)
  declare params: SignedTransactionParam[];
}

export default { RequestSendSignedTransactionDto };
