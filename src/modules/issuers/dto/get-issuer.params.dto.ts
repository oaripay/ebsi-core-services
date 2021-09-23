import { IsDid } from "../../../shared/validators";

export class GetIssuerParamsDto {
  @IsDid()
  "did": string;
}

export default GetIssuerParamsDto;
