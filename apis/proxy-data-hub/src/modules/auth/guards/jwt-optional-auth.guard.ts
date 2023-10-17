import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { UserInfo } from "../auth.interface.js";
import { AuthService } from "../auth.service.js";

@Injectable()
export class JwtOptionalAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: {
        authorization: string;
      };
      user: UserInfo;
    }>();
    request.user = {
      did: "",
    };

    const { headers } = request;

    if (
      !headers.authorization ||
      !headers.authorization.startsWith("Bearer ")
    ) {
      return true;
    }

    const token = headers.authorization.replace("Bearer ", "");
    const payload = await this.authService.validateToken(token);
    request.user.did = payload.sub!;

    return true;
  }
}

export default JwtOptionalAuthGuard;
