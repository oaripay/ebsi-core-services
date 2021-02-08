import {
  IsArray,
  Equals,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "../jsonrpc.dto";
import { SignedTransactionParam } from "./signed-transaction-param.dto";

export class RequestSignedTransactionDto extends JsonRpcDto {
  @Equals("signedTransaction")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => SignedTransactionParam)
  params: SignedTransactionParam[];
}

export default RequestSignedTransactionDto;
