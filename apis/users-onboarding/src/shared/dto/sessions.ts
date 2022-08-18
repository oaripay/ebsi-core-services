import { IsIn, IsNotEmptyObject } from "class-validator";
import {
  CaptchaAuthenticationInfo,
  EULoginAuthenticationInfo,
} from "../interfaces";

export class UserAuthentication {
  @IsIn(["eu-login", "recaptcha"])
  onboarding: string;

  @IsNotEmptyObject()
  info: CaptchaAuthenticationInfo | EULoginAuthenticationInfo;
}

export default UserAuthentication;
