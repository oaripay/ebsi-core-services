import { InternalServerError, NotFoundError } from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";

import type {
  GetCreatorQuery,
  GetOperatorQuery,
  Invitation_filter,
} from "../../../.graphclient/index.js";
import type { Access } from "./accesses.interface.js";

import { getBuiltGraphSDK } from "../../../.graphclient/index.js";
import { didToHex, hexToDid } from "../../shared/utils.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export default class AccessesService {
  private readonly logger = new Logger(AccessesService.name);

  async getAccessesBySubject(
    subject: string,
    page: number,
    pagesize: number,
    where: Invitation_filter,
  ): Promise<{ items: Access[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetOperatorQuery;
    try {
      const subjectBuffer = await didToHex(subject);
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetOperator({
        pagesize: queryPageSize,
        skip,
        subject: subjectBuffer,
        where,
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
      const { document, grantedBy, subject: sub, type: permission } = inv;
      return {
        documentId: document.id,
        grantedBy: hexToDid(grantedBy),
        permission,
        subject: hexToDid(sub),
      };
    });

    return { items };
  }

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

    if (!res.creator?.active) {
      throw new NotFoundError("Creator Not Found", {
        detail: `${did} is not allowlisted as a creator`,
      });
    }
  }
}
