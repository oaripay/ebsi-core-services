import { Type } from "class-transformer";
import {
  IsBase64,
  IsHexadecimal,
  IsString,
  ValidateNested,
} from "class-validator";
import { CommitActionDto } from "./commit-action.dto";

export class CommitTransactionParam {
  @IsString()
  channelName: string;

  @IsString()
  contractName: string;

  @ValidateNested()
  @Type(() => CommitActionDto)
  action: CommitActionDto;

  @IsBase64()
  payload: string;

  @IsBase64()
  signature: string;

  @IsHexadecimal()
  transactionId: string;
}

export default { CommitTransactionParam };
