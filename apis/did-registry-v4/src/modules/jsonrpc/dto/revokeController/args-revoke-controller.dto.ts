import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsRevokeController {
  @IsDidV1()
  did!: string;

  @IsDidV1()
  controller!: string;
}
