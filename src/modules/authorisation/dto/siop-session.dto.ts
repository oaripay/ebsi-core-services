import { IsJWT } from "class-validator";

export class SiopSessionDto {
  @IsJWT()
  id_token: string;
}

export default SiopSessionDto;
