import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Observable } from "rxjs";
import { UnauthorizedError } from "@ebsiint-api/shared";
import { SubjectInfo } from "../auth.interface.js";

@Injectable()
export class OAuth2OrSiopJwtAuthGuard extends AuthGuard("oauth2-siop-jwt") {
  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  override handleRequest<TUser = SubjectInfo>(
    err: Error,
    subjectInfo: TUser,
    info: unknown,
  ): TUser {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || info || !subjectInfo) {
      throw (
        err ||
        new UnauthorizedError(UnauthorizedError.defaultTitle, {
          detail: "Invalid or missing JWT",
        })
      );
    }

    return subjectInfo;
  }
}

export default OAuth2OrSiopJwtAuthGuard;
