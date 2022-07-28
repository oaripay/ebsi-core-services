import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { UserInfo } from "../auth.interface";

export { UserInfo } from "../auth.interface";

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: UserInfo }>();
    return request.user;
  }
);

export default User;
