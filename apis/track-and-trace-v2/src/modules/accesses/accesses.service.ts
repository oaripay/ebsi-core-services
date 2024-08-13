import { Injectable, Logger } from "@nestjs/common";
import { InternalServerError, NotFoundError } from "@ebsiint-api/shared";
import type { Access } from "./accesses.interface.js";
import { hexToDid, didToHex } from "../../shared/utils.js";
import {
  getBuiltGraphSDK,
  GetCreatorQuery,
  GetOperatorQuery,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export default class AccessesService {
  private readonly logger = new Logger(AccessesService.name);

  async isCreator(did: string): Promise<void> {
    let res: GetCreatorQuery;
    try {
      res = await sdk.GetCreator({ did });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.creator || !res.creator.active) {
      throw new NotFoundError("Creator Not Found", {
        detail: `${did} is not allowlisted as a creator`,
      });
    }
  }

  async getAccessesBySubject(
    subject: string,
    page: number,
    pagesize: number,
  ): Promise<{ items: Access[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetOperatorQuery;
    try {
      const subjectBuffer = await didToHex(subject);
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetOperator({
        subject: subjectBuffer,
        skip,
        pagesize: queryPageSize,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.operator) return { items: [] };

    const items = res.operator.invitations.map((inv) => {
      const { subject: sub, type: permission, grantedBy, document } = inv;
      return {
        subject: hexToDid(sub),
        permission,
        documentId: document.id,
        grantedBy: hexToDid(grantedBy),
      };
    });

    return { items };
  }
}
