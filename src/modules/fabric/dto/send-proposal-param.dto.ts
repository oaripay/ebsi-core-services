import { Type } from "class-transformer";
import { IsBase64, IsString, ValidateNested } from "class-validator";
import { ProposalActionDto } from "./proposal-action.dto";

export class SendProposalParam {
  @IsString()
  channelName: string;

  @IsString()
  contractName: string;

  @ValidateNested()
  @Type(() => ProposalActionDto)
  action: ProposalActionDto;

  @IsBase64()
  payload: string;

  @IsBase64()
  signature: string;
}

export default { SendProposalParam };
