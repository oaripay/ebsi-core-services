import { Equals, IsJWT } from "class-validator";

export class OAuth2SessionDto {
  @Equals("client_credentials")
  grantType: string;

  @Equals("urn:ietf:params:oauth:client-assertion-type:jwt-bearer")
  clientAssertionType: string;

  @IsJWT()
  clientAssertion: string;

  @Equals("openid did_authn")
  scope: string;
}

export default OAuth2SessionDto;
