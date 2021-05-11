import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { UserInfo } from "../auth.interface";
import AuthService from "../auth.service";

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
      return false;
    const token = headers.authorization.replace("Bearer ", "");
    await this.authService.validateToken(token);
    return true;
  }
}

export default JwtAuthGuard;
