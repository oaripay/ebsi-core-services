import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosResponse } from "axios";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from "@cef-ebsi/problem-details-errors";
import { BesuResponseObject } from "./besu.interface";
import { ApiConfig } from "../../config/configuration";
import { isDeployingSmartContract } from "./besu.utils";
import { BesuDto } from "./dto";

@Injectable()
export class BesuService {
  private readonly logger = new Logger(BesuService.name);

  constructor(private configService: ConfigService<ApiConfig>) {}

  // Make it easier to override the config in tests
  getBesuRpcNode(): string {
    return this.configService.get<string>("besuRpcNode");
  }

  async sendToBesu(query: BesuDto): Promise<AxiosResponse<BesuResponseObject>> {
    let isDeployingSC = false;
    const besuRpcNode = this.getBesuRpcNode();

    try {
      isDeployingSC = await isDeployingSmartContract(query, besuRpcNode);
    } catch (error) {
      if ((error as Error).message.includes("Error getting EBSI chainId")) {
        throw error;
      }

      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: `Error parsing the transaction: ${(error as Error).message}`,
      });
    }

    if (isDeployingSC) {
      throw new ForbiddenError(ForbiddenError.defaultTitle, {
        detail: "Deployment of new smart contracts is not allowed",
      });
    }

    // Send request to Besu
    const besuResponse = await axios.post<BesuResponseObject>(
      besuRpcNode,
      query,
      {
        // Resolve all requests
        validateStatus: () => true,
      }
    );

    if (besuResponse.status >= 400 && !besuResponse.data.error) {
      // There was an error and it did not come from Besu

      // Log whatever could be useful for debugging
      this.logger.error("An error occured while querying Besu");
      this.logger.error({
        status: besuResponse.status,
        request: besuResponse.request as unknown,
        data: besuResponse.data,
        headers: besuResponse.headers as unknown,
        config: besuResponse.config,
      });

      // Don't reveal details to the client
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail:
          "The server encountered an internal error and was unable to complete your request",
      });
    }

    return besuResponse;
  }
}

export default { BesuService };
