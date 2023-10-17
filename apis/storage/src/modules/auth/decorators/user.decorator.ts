import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { ClientInfo } from "../auth.interface.js";

export type { ClientInfo } from "../auth.interface.js";

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: ClientInfo }>();
    return request.user ?? {};
  },
);

export default User;
