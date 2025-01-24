import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { SubjectInfo } from "../auth.interface.js";

export type { SubjectInfo } from "../auth.interface.js";

export const Subject = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: SubjectInfo }>();
    return request.user ?? {};
  },
);

export default Subject;
