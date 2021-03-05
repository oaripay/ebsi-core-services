import { IsJWT, IsString } from "class-validator";

export class SiopSessionDto {
  @IsJWT()
  id_token: string;

  @IsString()
  state: string;
}

export default SiopSessionDto;
