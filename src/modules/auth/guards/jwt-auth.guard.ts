import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { UserInfo } from "../auth.interface";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Add your custom authentication logic here
    // for example, call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest<UserInfo>(err: Error, user: UserInfo, info: unknown): UserInfo {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || info || !user) {
      throw (
        err ||
        new UnauthorizedError(UnauthorizedError.defaultTitle, {
          detail: "Invalid or missing JWT",
        })
      );
    }

    return user;
  }
}

export default JwtAuthGuard;
