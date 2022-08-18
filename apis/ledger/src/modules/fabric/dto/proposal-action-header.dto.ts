import { IsBase64 } from "class-validator";

export class ProposalActionHeader {
  @IsBase64()
  signature_header: string;

  @IsBase64()
  channel_header: string;
}

export default { ProposalActionHeader };
