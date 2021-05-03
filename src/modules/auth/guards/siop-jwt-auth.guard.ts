import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { UnauthorizedError } from "@cef-ebsi/problem-details-errors";
import { ClientInfo } from "../auth.interface";

@Injectable()
export class SiopJwtAuthGuard extends AuthGuard("siop-jwt") {
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<ClientInfo>(
    err: Error,
    clientInfo: ClientInfo,
    info: unknown
  ): ClientInfo {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || info || !clientInfo) {
      throw (
        err ||
        new UnauthorizedError(UnauthorizedError.defaultTitle, {
          detail: "Invalid or missing JWT",
        })
      );
    }

    return clientInfo;
  }
}

export default SiopJwtAuthGuard;
