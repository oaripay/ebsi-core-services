import { IsDidV1 } from "../../../shared/validators";

export class GetIssuerParamsDto {
  @IsDidV1()
  "did": string;
}

export default GetIssuerParamsDto;
