import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { ClientInfo } from "../auth.interface";

export { ClientInfo } from "../auth.interface";

export const Client = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: ClientInfo }>();
    // TODO: double check
    return request.user;
  }
);

export default Client;
