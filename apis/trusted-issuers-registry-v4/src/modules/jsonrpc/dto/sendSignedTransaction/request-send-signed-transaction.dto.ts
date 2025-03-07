import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { SignedTransactionParam } from "./signed-transaction-param.dto.ts";

export class RequestSendSignedTransactionDto extends JsonRpcDto {
  @Equals("sendSignedTransaction")
  declare method: "sendSignedTransaction";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => SignedTransactionParam)
  declare params: SignedTransactionParam[];
}

export default RequestSendSignedTransactionDto;
