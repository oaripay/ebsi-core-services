import { IsBase64 } from "class-validator";

export class ProposalActionProposal {
  @IsBase64()
  header: string;

  @IsBase64()
  payload: string;
}

export default { ProposalActionProposal };
