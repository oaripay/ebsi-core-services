import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-http-bearer";

import type { SubjectInfo } from "../auth.interface.js";

import { AuthService } from "../auth.service.js";

@Injectable()
export class BearerJwtStrategy extends PassportStrategy(
  Strategy,
  "bearer-jwt",
) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(bearerToken: string): Promise<SubjectInfo> {
    return this.authService.validateToken(bearerToken);
  }
}

export default BearerJwtStrategy;
