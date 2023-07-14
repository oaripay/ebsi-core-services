import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { SignedTransactionParam } from "./signed-transaction-param.dto";
import { JsonRpcDto } from "../jsonrpc.dto";

export class RequestSendSignedTransactionDto extends JsonRpcDto {
  @Equals("sendSignedTransaction")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => SignedTransactionParam)
  params: SignedTransactionParam[];
}

export default { RequestSendSignedTransactionDto };
