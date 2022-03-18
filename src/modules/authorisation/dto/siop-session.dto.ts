import { IsJWT, IsOptional } from "class-validator";

export class SiopSessionDto {
  @IsJWT()
  id_token: string;

  @IsOptional()
  @IsJWT()
  vp_token?: string;
}

export default SiopSessionDto;
