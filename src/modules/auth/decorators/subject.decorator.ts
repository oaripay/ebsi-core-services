import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { SubjectInfo } from "../auth.interface";

export { SubjectInfo } from "../auth.interface";

export const Subject = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: SubjectInfo }>();
    // TODO: double check
    return request.user;
  }
);

export default Subject;
