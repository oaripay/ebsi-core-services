import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Observable } from "rxjs";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { AppInfo } from "../auth.interface";

@Injectable()
export class OAuth2JwtAuthGuard extends AuthGuard("oauth2-jwt") {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser = AppInfo>(
    err: Error,
    appInfo: TUser,
    info: unknown
  ): TUser {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || info || !appInfo) {
      throw (
        err ||
        new UnauthorizedError(UnauthorizedError.defaultTitle, {
          detail: "Invalid or missing JWT",
        })
      );
    }

    return appInfo;
  }
}

export default OAuth2JwtAuthGuard;
