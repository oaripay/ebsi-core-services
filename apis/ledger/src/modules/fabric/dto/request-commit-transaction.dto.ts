import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "./jsonrpc.dto";
import { CommitTransactionParam } from "./commit-transaction-param.dto";

export class RequestCommitTransactionDto extends JsonRpcDto {
  @Equals("commitTransaction")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => CommitTransactionParam)
  params: CommitTransactionParam[];
}

export default RequestCommitTransactionDto;
