import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { UnauthorizedError } from "@ebsiint-api/shared";
import { UserInfo } from "../auth.interface.js";
import { AuthService } from "../auth.service.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: {
        authorization: string;
      };
      user: UserInfo;
    }>();
    const { headers } = request;
    if (!headers.authorization || !headers.authorization.startsWith("Bearer "))
      throw new UnauthorizedError(UnauthorizedError.defaultTitle, {
        detail: "Missing JWT",
      });
    const token = headers.authorization.replace("Bearer ", "");
    const payload = await this.authService.validateToken(token);
    request.user = {
      sub: payload.sub!,
      login_hint: payload.login_hint,
    };
    return true;
  }
}

export default JwtAuthGuard;
