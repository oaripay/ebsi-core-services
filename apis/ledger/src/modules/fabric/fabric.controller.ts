import {
  Controller,
  Get,
  Query,
  Param,
  HttpCode,
  UseGuards,
  Post,
  Body,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { FabricService } from "./fabric.service";
import { PaginatedList, Block, Transaction } from "./interfaces";
import { ApiConfig } from "../../config/configuration";
import { PaginationQueryDto } from "./dto/pagination-query.dto";
import { GetChannelBlockParams } from "./dto/get-channel-block.params";
import {
  formatBlocks,
  formatChannels,
  formatTransactions,
} from "./fabric.formatter";
import { GetChannelParams } from "./dto/get-channel.params";
import { FabricEnabledGuard } from "./fabric.guard";
import { PaginationQueryTransactionsDto } from "./dto/pagination-query-transactions.dto";
import { GetChannelTransactionParams } from "./dto/get-channel-transaction.params";
import { JsonRpcDto } from "./dto/jsonrpc.dto";
import { JsonRpcResponseObject } from "./fabric.interface";
import { RequestReadContractDto } from "./dto/request-read-contract.dto";
import { MethodNotFoundJsonRpcError } from "./errors";
import { RequestSendProposalDto } from "./dto/request-send-proposal.dto";
import { RequestCommitTransactionDto } from "./dto/request-commit-transaction.dto";

function formatJsonRpcResponse(
  result: unknown,
  id: string | number
): JsonRpcResponseObject {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

@Controller("/blockchains/fabric")
@UseGuards(FabricEnabledGuard)
export class FabricController {
  private apiUrlPrefix: string;

  private domain: string;

  constructor(
    private fabricService: FabricService,
    private configService: ConfigService<ApiConfig>
  ) {
    this.apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    this.domain = this.configService.get<string>("domain");
  }

  @HttpCode(200)
  @Post("/jsonrpc")
  async jsonRPC(@Body() body: JsonRpcDto): Promise<JsonRpcResponseObject> {
    const { method, id } = body;
    switch (method) {
      case "readContract": {
        const result = await this.fabricService.readContract(
          body as RequestReadContractDto,
          id
        );
        return formatJsonRpcResponse(result, id);
      }
      case "sendProposal": {
        const result = await this.fabricService.sendProposal(
          body as RequestSendProposalDto,
          id
        );
        return formatJsonRpcResponse(result, id);
      }
      case "commitTransaction": {
        const result = await this.fabricService.commitTransaction(
          body as RequestCommitTransactionDto,
          id
        );
        return formatJsonRpcResponse(result, id);
      }
      default:
        throw new MethodNotFoundJsonRpcError(
          `The method '${method}' is invalid`,
          id
        );
    }
  }

  @Get("/channels")
  getChannels(@Query() query: PaginationQueryDto): PaginatedList<string> {
    const channels = this.fabricService.getChannels();

    const baseUrl = `${this.domain}${this.apiUrlPrefix}/blockchains/fabric/channels`;

    return formatChannels(
      channels,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/channels/:channelName")
  @HttpCode(204)
  getChannel(@Param() params: GetChannelParams): void {
    const channels = this.fabricService.getChannels();

    if (!channels.includes(params.channelName)) {
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: `Channel ${params.channelName} not found`,
      });
    }
  }

  @Get("/channels/:channelName/blocks")
  @HttpCode(200)
  async getChannelBlocks(
    @Param() params: GetChannelParams,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedList<Block>> {
    // Make sure the channel exists
    this.getChannel(params);

    // Get blocks
    const { blocks, total } = await this.fabricService.getChannelBlocks(
      params.channelName,
      query["page[after]"],
      query["page[size]"]
    );

    const baseUrl = `${this.domain}${this.apiUrlPrefix}/blockchains/fabric/channels/${params.channelName}/blocks`;

    return formatBlocks(
      blocks,
      total,
      query["page[after]"],
      query["page[size]"],
      baseUrl
    );
  }

  @Get("/channels/:channelName/blocks/:blockNumber")
  @HttpCode(200)
  async getChannelBlock(
    @Param() params: GetChannelBlockParams
  ): Promise<Block> {
    // Make sure the channel exists
    this.getChannel(params);

    // Get block
    const block = await this.fabricService.getChannelBlock(
      params.channelName,
      params.blockNumber
    );

    return block;
  }

  @Get("/channels/:channelName/transactions")
  @HttpCode(200)
  async getChannelTransactions(
    @Param() params: GetChannelParams,
    @Query() query: PaginationQueryTransactionsDto
  ): Promise<PaginatedList<Transaction>> {
    // Make sure the channel exists
    this.getChannel(params);

    // Get transactions
    const { transactions, firstPage, nextPage } =
      await this.fabricService.getChannelTransactions(
        params.channelName,
        query["page[after]"],
        query["page[size]"]
      );

    const baseUrl = `${this.domain}${this.apiUrlPrefix}/blockchains/fabric/channels/${params.channelName}/transactions`;

    return formatTransactions(
      transactions,
      query["page[after]"],
      query["page[size]"],
      baseUrl,
      firstPage,
      nextPage
    );
  }

  @Get("/channels/:channelName/transactions/:transactionId")
  @HttpCode(200)
  async getChannelTransaction(
    @Param() params: GetChannelTransactionParams
  ): Promise<Transaction> {
    // Make sure the channel exists
    this.getChannel(params);

    // Get transaction
    const transaction = await this.fabricService.getChannelTransaction(
      params.channelName,
      params.transactionId
    );

    return transaction;
  }
}

export default FabricController;
