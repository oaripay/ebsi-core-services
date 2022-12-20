import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Observable } from "rxjs";
import type { FastifyReply } from "fastify";
import { tap } from "rxjs/operators";
import { ApiConfig } from "../config/configuration";

@Injectable()
export class VersionInterceptor implements NestInterceptor {
  private tag: string;

  constructor(configService: ConfigService<ApiConfig, true>) {
    this.tag = configService.get<string>("dockerContainerTag");
  }

  public intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<FastifyReply>();

        if (this.tag) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          res.header("EBSI-Image-Tag", this.tag);
        }
      })
    );
  }
}

export default VersionInterceptor;
