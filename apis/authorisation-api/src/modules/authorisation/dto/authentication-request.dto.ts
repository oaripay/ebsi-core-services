import { Equals } from "class-validator";

export class AuthenticationRequestDto {
  @Equals("openid did_authn")
  scope: string;
}

export default AuthenticationRequestDto;
