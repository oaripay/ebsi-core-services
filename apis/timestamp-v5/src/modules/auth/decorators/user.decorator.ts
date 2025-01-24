import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { UserInfo } from "../auth.interface.js";

export type { UserInfo } from "../auth.interface.js";

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: UserInfo }>();
    return request.user;
  },
);

export default User;
