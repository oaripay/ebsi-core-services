import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { SubjectInfo } from "../auth.interface";

@Injectable()
export class OAuth2OrSiopJwtAuthGuard extends AuthGuard("oauth2-siop-jwt") {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<SubjectInfo>(
    err: Error,
    subjectInfo: SubjectInfo,
    info: unknown
  ): SubjectInfo {
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
