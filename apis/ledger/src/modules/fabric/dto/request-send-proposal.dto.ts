import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Equals,
} from "class-validator";
import { Type } from "class-transformer";
import { JsonRpcDto } from "./jsonrpc.dto";
import { SendProposalParam } from "./send-proposal-param.dto";

export class RequestSendProposalDto extends JsonRpcDto {
  @Equals("sendProposal")
  method: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => SendProposalParam)
  params: SendProposalParam[];
}

export default RequestSendProposalDto;
