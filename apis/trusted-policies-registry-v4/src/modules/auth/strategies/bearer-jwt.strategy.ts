import { Strategy } from "passport-http-bearer";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { AuthService } from "../auth.service.js";
import { SubjectInfo } from "../auth.interface.js";

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
