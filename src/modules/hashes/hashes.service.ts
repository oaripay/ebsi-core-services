import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestError,
  ExpectationFailedError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { ethers } from "ethers";
import {
  HashResponseObject,
  HashesListResponseObject,
  RecEvent,
  NotaryContract,
} from "./types/hashes.interface";

@Injectable()
export class HashesService {
  private readonly logger = new Logger(HashesService.name);

  private readonly ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

  private readonly provider = new ethers.providers.JsonRpcProvider(
    this.configService.get<string>("besuRPCNode")
  );

  private contract: NotaryContract;

  constructor(private configService: ConfigService) {
    this.contract = (new ethers.Contract(
      this.configService.get<string>("besuAddressNotary"),
      this.configService.get<Array<unknown>>("besuNotaryAbi"),
      this.provider
    ) as unknown) as NotaryContract;
  }

  private async buildRecord(
    log: ethers.providers.Log
  ): Promise<HashResponseObject> {
    const block = await this.provider.getBlock(log.blockNumber);
    const timestamp = new Date(block.timestamp * 1000);
    return {
      hash: log.topics[1].replace("0x", ""),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      timestamp: timestamp.toISOString(),
      registeredBy: log.topics[2].replace("000000000000000000000000", ""),
    };
  }

  /*
   * Function to walk around all the records in the contract
   * starting from the last one. On each iteration a
   * callback function is executed.
   * The loop stops if the callback returns true or if the callback count reach the MAXIMUM_PAST_BLOCK_TO_PARSE
   */
  private async iterateContract(
    callback: (log: ethers.providers.Log) => Promise<boolean>
  ): Promise<RecEvent> {
    let lastBlockREC = Number(await this.contract.lastBlockREC());
    const filterRec = this.contract.filters.REC();
    let logRec: ethers.providers.Log = null;

    /* eslint-disable no-await-in-loop */
    while (lastBlockREC !== 0) {
      const logs = await this.contract.queryFilter(
        filterRec,
        lastBlockREC,
        lastBlockREC
      );
      if (logs.length === 0) {
        const err = `Can't find any REC events in lastBlockREC :${lastBlockREC}`;
        this.logger.error(err);
        throw new Error(err);
      }
      let exitLoop = false;
      for (let i = 0; i < logs.length && !exitLoop; i += 1) {
        const finished = await callback(logs[i]);
        if (finished) {
          exitLoop = true;
          logRec = logs[i];
        }
      }
      if (exitLoop) break;
      const x = logs[0];

      lastBlockREC = Number(x.topics[3]);
    }
    /* eslint-enable no-await-in-loop */

    return { lastBlockREC, logRec };
  }

  /**
   * retrieve the Add record event for a specific document hash
   * @param {string} docHash - document hash
   */
  private async getRecEvent(docHash: string): Promise<RecEvent> {
    const filter = this.contract.filters.REC(docHash);
    const logs = await this.provider.getLogs(filter);
    const lastBlockREC = Number(logs[0].topics[3]);
    const [logRec] = logs;
    return { lastBlockREC, logRec };
  }

  /*
   * Get a list of records
   */
  async getRecordList(pageSize: number): Promise<HashesListResponseObject> {
    let anchorPageSize: number;
    if (!pageSize) {
      anchorPageSize = this.configService.get<number>("defaultPageSize");
    } else {
      anchorPageSize = pageSize;
    }

    const items = [];
    let lastBlockRECEvent: RecEvent;
    try {
      lastBlockRECEvent = await this.iterateContract(async (log) => {
        const record = await this.buildRecord(log);
        this.logger.debug(
          `getRecordList add record to results
           ${JSON.stringify(record)}
          `
        );
        items.push(record);
        if (items.length < anchorPageSize) return false; // continue
        return true;
      });
    } catch (error: unknown) {
      throw new ExpectationFailedError(ExpectationFailedError.defaultTitle, {
        detail: (error as { message: string }).message,
      });
    }
    const links = {
      first: `${this.configService.get<string>(
        "apiUrl"
      )}/hashes?page[after]=0&page[size]=${pageSize}`,

      prev: `${this.configService.get<string>("apiUrl")}/hashes?page[after]=${
        lastBlockRECEvent.lastBlockREC
      }&page[size]=${pageSize}`,

      next: `${this.configService.get<string>("apiUrl")}/hashes?page[after]=${
        lastBlockRECEvent.lastBlockREC
      }&page[size]=${pageSize}`,

      last: `${this.configService.get<string>(
        "apiUrl"
      )}/hashes?page[after]=${pageSize}&page[size]=${pageSize}`,
    };

    return {
      self: `${this.configService.get<string>("apiUrl")}/hashes`,
      items,
      total: items.length,
      pageSize,
      links,
    };
  }

  /*
   * Get record by the document hash
   */
  async getRecord(_hash: string): Promise<HashResponseObject> {
    let hash = _hash.toLowerCase();
    if (!hash.startsWith("0x")) hash = `0x${hash}`;

    let registeredBy: string;
    try {
      registeredBy = await this.contract.record(hash);
    } catch (error) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: (error as { message: string }).message,
      });
    }

    if (registeredBy === this.ADDRESS_ZERO)
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: `Document hash '${_hash}' not found`,
      });

    let logRec: ethers.providers.Log;
    let lastBlockREC: number;
    try {
      const res = await this.getRecEvent(hash);
      this.logger.debug(
        `getRecEvent for hash:${hash}
         ${JSON.stringify(res)}
        `
      );
      lastBlockREC = res.lastBlockREC;
      logRec = res.logRec;
    } catch (error) {
      throw new ExpectationFailedError(ExpectationFailedError.defaultTitle, {
        detail: (error as { message: string }).message,
      });
    }
    if (lastBlockREC === 0)
      throw new Error(
        `Document hash '${hash}' not found, however the NotFoundError was not fired`
      );

    if (logRec) {
      return this.buildRecord(logRec);
    }
    // if we haven't found a logRec at this point it means that it is too old to answer in time
    return Promise.resolve({
      hash: hash.replace("0x", ""),
      txHash: "",
      blockNumber: 0,
      timestamp: new Date().toISOString(),
      registeredBy,
    });
  }
}

export default HashesService;
