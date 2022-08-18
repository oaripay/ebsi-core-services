import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsHexadecimal,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { ProposalActionHeader } from "./proposal-action-header.dto";
import { ProposalActionProposal } from "./proposal-action-proposal.dto";

export class ProposalActionDto {
  @IsBoolean()
  init: boolean;

  @IsOptional()
  @IsObject()
  transientMap: unknown;

  @IsHexadecimal()
  transactionId: string;

  @IsArray()
  @IsString({ each: true })
  args: string[];

  @IsString()
  fcn: string;

  @ValidateNested()
  @Type(() => ProposalActionHeader)
  header: ProposalActionHeader;

  @ValidateNested()
  @Type(() => ProposalActionProposal)
  proposal: ProposalActionProposal;
}

export default { ProposalActionDto };
