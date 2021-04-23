// For more info, read https://docs.nestjs.com/recipes/terminus
import { Body, Controller, Post } from "@nestjs/common";
import {
  AuthenticationResponse,
  AuthenticationRequest,
} from "src/shared/interfaces";
import AuthenticationService from "./authentication.service";

@Controller("/")
export class AuthenticationController {
  constructor(private authenticationService: AuthenticationService) {}

  @Post("/authentication-requests")
  async authenticationRequest(
    @Body() body: AuthenticationRequest
  ): Promise<AuthenticationResponse> {
    // validate user authentication
    const authenticationResponse = await this.authenticationService.startAuthentication(
      body
    );
    return authenticationResponse;
  }
}

export default AuthenticationController;
