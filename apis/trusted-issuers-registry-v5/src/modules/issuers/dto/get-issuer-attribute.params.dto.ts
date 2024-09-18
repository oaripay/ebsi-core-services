import { IsHexadecimal } from "class-validator";
import { GetIssuerParamsDto } from "./get-issuer.params.dto.js";

export class GetIssuerAttributeParamsDto extends GetIssuerParamsDto {
  @IsHexadecimal()
  "attributeId": string;
}

export default GetIssuerAttributeParamsDto;
