import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { hasOwnProperty } from "../../../shared/utils";
import { UserInfo } from "../auth.interface";
import { AuthService } from "../auth.service";

// Commented methods are private
// Methods that are not listed here are not available through Ledger API
const PUBLIC_BESU_METHODS = new Set([
  "net_version",
  "eth_chainId",
  "eth_blockNumber",
  "eth_getTransactionCount",
  "eth_getBlockTransactionCountByHash",
  "eth_getBlockTransactionCountByNumber",
  "eth_getUncleByBlockHashAndIndex",
  "eth_getUncleByBlockNumberAndIndex",
  "eth_getUncleCountByBlockHash",
  "eth_getUncleCountByBlockNumber",
  "eth_getCode",
  // "eth_sendRawTransaction",
  "eth_call",
  // "eth_estimateGas",
  "eth_getBlockByHash",
  "eth_getBlockByNumber",
  "eth_getTransactionByHash",
  "eth_getTransactionByBlockHashAndIndex",
  "eth_getTransactionByBlockNumberAndIndex",
  "eth_getTransactionReceipt",
  "eth_getLogs",
]);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: {
        authorization?: string;
        host?: string;
      };
      user?: UserInfo;
      body?: unknown;
      url?: string;
    }>();
    const { headers, url, body } = request;

    if (
      typeof url === "string" &&
      url.includes("/blockchains/besu") &&
      body &&
      typeof body === "object" &&
      hasOwnProperty(body, "method") &&
      typeof body.method === "string" &&
      PUBLIC_BESU_METHODS.has(body.method)
    ) {
      request.user = { sub: "" };
      return true;
    }

    if (
      !headers.authorization ||
      !headers.authorization.startsWith("Bearer ")
    ) {
      return false;
    }

    const token = headers.authorization.replace("Bearer ", "");
    const { host } = headers;
    const payload = await this.authService.validateToken(token, host);
    request.user = {
      sub: payload.sub,
    };
    return true;
  }
}

export default JwtAuthGuard;
