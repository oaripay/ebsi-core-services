import { Body, Controller, Post } from "@nestjs/common";
import { InvalidUserAuthentication } from "../../errors";
import { OnboardingErrors } from "../../errors/errorCodes";
import { SessionToken } from "../../shared/interfaces";
import { UserAuthentication } from "../../shared/dto";
import SessionsService from "./sessions.service";

@Controller("/sessions")
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Post("")
  async check(@Body() body: UserAuthentication): Promise<SessionToken> {
    const validatedInfo = await this.sessionsService.validateOnboarding(body);

    if (!validatedInfo) {
      throw new InvalidUserAuthentication(OnboardingErrors.VALIDATION_FAILED);
    }

    return this.sessionsService.provideSessionToken(body, validatedInfo);
  }
}

export default SessionsController;
