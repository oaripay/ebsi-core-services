import { IsBase64 } from "class-validator";

export class CommitActionPayloadHeaderDto {
  @IsBase64()
  signature_header: string;

  @IsBase64()
  channel_header: string;
}

export default { CommitActionPayloadHeaderDto };
