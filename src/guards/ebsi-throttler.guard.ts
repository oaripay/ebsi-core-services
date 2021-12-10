import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

const ignoreHosts = ["localhost", "127.0.0.1", "api.local", "0.0.0.0"];

function hasHost(obj: unknown): obj is {
  host: string;
} {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return Object.prototype.hasOwnProperty.call(obj, "host");
}

@Injectable()
export class EbsiThrottler extends ThrottlerGuard {
  public canBypassThrottler(context: ExecutionContext): boolean {
    const { req } = this.getRequestResponse(context);
    const { headers } = req;

    if (
      headers &&
      typeof headers === "object" &&
      hasHost(headers) &&
      headers.host &&
      typeof headers.host === "string"
    ) {
      const { host } = headers;
      if (ignoreHosts.find((reqHost) => host.includes(reqHost))) {
        return true;
      }
    }

    return false;
  }

  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number
  ): Promise<boolean> {
    // Return early if req.headers.host is one of the ignored host
    if (this.canBypassThrottler(context)) {
      return true;
    }

    return super.handleRequest(context, limit, ttl);
  }
}

export default EbsiThrottler;
