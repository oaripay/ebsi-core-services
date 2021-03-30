import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { UserInfo } from "../auth.interface";

@Injectable()
export class JwtOptionalAuthGuard extends AuthGuard("jwt") {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Add your custom authentication logic here
    // for example, call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest<UserInfo>(err: Error, user: UserInfo): UserInfo {
    return user;
  }
}

export default JwtOptionalAuthGuard;
