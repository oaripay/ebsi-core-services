import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError, isEthersError } from "@ebsiint-api/shared";
import type { TrackAndTrace } from "@ebsiint-sc/track-and-trace";
import { utils } from "ethers";
import { LedgerService } from "../ledger/ledger.service.js";
import type { Access } from "./accesses.interface.js";
import { hexToDid, didToHex, permissionToString } from "../../shared/utils.js";

@Injectable()
export default class AccessesService {
  private readonly logger = new Logger(AccessesService.name);

  constructor(private ledgerService: LedgerService) {}

  async isCreator(did: string): Promise<void> {
    try {
      const res = await (
        await this.ledgerService.getContract()
      ).isCreator(utils.toUtf8Bytes(did));
      if (!res) throw new Error();
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Creator Not Found", {
        detail: `${did} is not allowlisted as a creator`,
      });
    }
  }

  async getAccessesBySubject(subject: string): Promise<Access[]> {
    const pageSize = 50;
    const contract = await this.ledgerService.getContract();
    const subjectBuffer = await didToHex(subject);
    const documentIds: string[] = [];
    let currentPage = 1;
    let accessesBySubject: Awaited<
      ReturnType<TrackAndTrace["getAccessesBySubject"]>
    >;
    /* eslint-disable no-await-in-loop */
    do {
      accessesBySubject = await contract.getAccessesBySubject(
        subjectBuffer,
        currentPage,
        pageSize,
      );
      currentPage += 1;
      documentIds.push(...accessesBySubject.items);
    } while (accessesBySubject.total.gt((currentPage - 1) * pageSize));
    /* eslint-enable no-await-in-loop */

    const accesses: Access[] = [];
    await Promise.all(
      documentIds.map(async (documentId) => {
        const [grantedByAccounts, , access] = await contract.getGrantedBy(
          documentId,
          subjectBuffer,
          [0 /* DELEGATE */, 1 /* WRITE */, 2 /* CREATOR */],
        );
        grantedByAccounts.forEach((grantedByAccount, i) => {
          if (!grantedByAccount || grantedByAccount === "0x") return;
          if (!access[i]) return;
          const grantedBy = hexToDid(grantedByAccount);
          const permission = permissionToString(i);

          accesses.push({
            documentId,
            subject,
            grantedBy,
            permission,
          });
        });
      }),
    );
    return accesses;
  }
}
