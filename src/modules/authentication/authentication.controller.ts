import { Body, Controller, Post } from "@nestjs/common";
import {
  VerifiableAuthorization,
  AuthenticationResponse,
  AuthenticationRequest,
  AuhtenticationResponseRequest,
} from "src/shared/interfaces";
import AuthenticationService from "./authentication.service";

@Controller("/")
export class AuthenticationController {
  constructor(private authenticationService: AuthenticationService) {}

  @Post("/authentication-requests")
  async authenticationRequest(
    @Body() body: AuthenticationRequest
  ): Promise<AuthenticationResponse> {
    const authenticationResponse = await this.authenticationService.startAuthentication(
      body
    );
    return authenticationResponse;
  }

  // TEMPORARILY DISABLED FOR DEMO
  // @UseGuards(JwtAuthGuard)
  @Post("/authentication-responses")
  async authenticationResponse(
    @Body() body: AuhtenticationResponseRequest
  ): Promise<VerifiableAuthorization> {
    const subject = await this.authenticationService.validateResponse(body);
    return this.authenticationService.createVerifiableAuthorisation(subject);
  }
}

export default AuthenticationController;
