import { Injectable } from "@nestjs/common";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { UserInfo, JwtPayload } from "./auth.interface";

@Injectable()
export class AuthService {
  async validateToken(payload: JwtPayload): Promise<UserInfo> {
    // Custom validation
    if (!payload.did) {
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: "Invalid JWT: DID is missing",
      });
    }

    // Perform other verifications...
    await Promise.resolve();

    // Populate "user" object
    return { did: payload.did };
  }
}

export default AuthService;
