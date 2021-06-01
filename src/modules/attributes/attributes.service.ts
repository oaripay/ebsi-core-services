import { Injectable, Logger } from "@nestjs/common";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from "@cef-ebsi/problem-details-errors";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError } from "axios";
import { v4 as uuidV4 } from "uuid";
import jsonpatch from "jsonpatch";
import { decodeJWT } from "@cef-ebsi/did-jwt";
import { Agent } from "@cef-ebsi/oauth2-auth";
import { ApiConfig } from "../../config/configuration";
import {
  AttributeResponseObject,
  AttributeCassandraModel,
  AxiosResponseJsonRpc,
  CassandraResponse,
} from "./attributes.interface";
import { AttributeBodyDto, PatchAttributeBody } from "./dto";
import { encrypt, decrypt, logAxiosError } from "../../shared/utils";

interface PageOpts {
  fetchSize: number;
  pageState: string;
}

const SHARED_PREFIX = "__shared__";

// Refresh the token if it expires in less than 10 seconds
const REFRESH_LIMIT = 10 * 1000;

@Injectable()
export class AttributesService {
  private readonly logger = new Logger(AttributesService.name);

  private urlJsonrpcStorage: string;

  private secret: string;

  private storageApiUrl: string;

  private storageUri: string;

  private accessTokenExp: number;

  private accessToken: string;

  private agent: Agent;

  private authorisationApiUrl: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.secret = this.configService.get<string>("encryptionSecret");
    this.storageApiUrl = this.configService.get<string>("storageApiUrl");
    this.storageUri = `${this.storageApiUrl}/stores/distributed`;
    this.urlJsonrpcStorage = `${this.storageApiUrl}/stores/distributed/jsonrpc`;

    this.authorisationApiUrl = this.configService.get<string>(
      "authorisationApiUrl"
    );
    const privKey = this.configService.get<string>("apiPrivateKey");
    this.agent = new Agent(privKey, {
      issuer: this.configService.get<string>("apiName"),
      kid: this.configService.get<string>("apiKid"),
    });
  }

  async checkSession(): Promise<void> {
    if (
      !this.accessTokenExp ||
      Date.now() + REFRESH_LIMIT > this.accessTokenExp * 1000
    ) {
      this.accessToken = await this.getAccessToken();
    }
  }

  private async getAccessToken() {
    const nonce = uuidV4();

    const requestComponent = await this.agent.createRequestPayload(
      this.configService.get<string>("storageApiName"),
      { nonce }
    );

    // Send request payload to Authorisation API
    try {
      const res = await axios.post(
        `${this.authorisationApiUrl}/oauth2-sessions`,
        requestComponent
      );

      const accessToken = await this.agent.verifyAuthenticationResponse(
        res.data,
        nonce
      );

      const { payload } = decodeJWT(accessToken);
      this.accessTokenExp = payload.exp;

      return accessToken;
    } catch (err) {
      if (err instanceof Error) {
        if ((err as AxiosError).isAxiosError) {
          logAxiosError(err as AxiosError, this.logger);
        } else {
          this.logger.error(err.message, err.stack);
        }
      } else {
        this.logger.error(err);
      }
      throw new InternalServerError();
    }
  }

  async storageJsonrpc(
    params: (string | PageOpts)[]
  ): Promise<CassandraResponse> {
    await this.checkSession();

    const data = {
      jsonrpc: "2.0",
      method: "cassandra_call",
      params,
      id: Math.trunc(Math.random() * 1000),
    };

    const opts = {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    };

    const response: AxiosResponseJsonRpc = await axios.post(
      this.urlJsonrpcStorage,
      data,
      opts
    );
    return response.data.result as CassandraResponse;
  }

  async getDidByAttributeHash(hash: string): Promise<string> {
    const result = await this.storageJsonrpc([
      "select did from attribute_storage where hash = ?",
      hash,
    ]);

    if (result.rows.length === 0) return "";
    return (result.rows[0] as AttributeCassandraModel).did;
  }

  async getAttributes(
    did: string,
    pageAfter: string,
    fetchSize: number
  ): Promise<{ attributes: AttributeResponseObject[]; pageAfter: string }> {
    // Note: The page state token can be manipulated to retrieve other results within the same
    // column family, so it is not safe to expose it to the users in plain text.
    // https://docs.datastax.com/en/developer/nodejs-driver/4.6/features/paging/
    let pageState = "";
    let readingSharedAttributes = false;
    if (pageAfter) {
      try {
        pageState = decrypt(pageAfter, this.secret);
        if (pageState.startsWith(SHARED_PREFIX)) {
          readingSharedAttributes = true;
          pageState = pageState.replace(SHARED_PREFIX, "");
        }
      } catch (e) {
        this.logger.error((e as Error).message, (e as Error).stack);
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: "Invalid page[after] parameter",
        });
      }
    }

    const cassandraQuery = readingSharedAttributes
      ? "select * from attribute_storage where shared_with = ? allow filtering"
      : "select * from attribute_storage where did = ? allow filtering";

    const result = await this.storageJsonrpc([
      cassandraQuery,
      did,
      {
        ...(fetchSize && { fetchSize }),
        ...(pageState && pageState !== "null" && { pageState }),
      },
    ]);

    const { pageState: newPageState, rows } = result;

    const items = rows.map((row): AttributeResponseObject => {
      const r = row as AttributeCassandraModel;
      return {
        storageUri: this.storageUri,
        hash: r.hash,
        did: r.did,
        visibility: r.visibility,
        sharedWith: r.shared_with,
        contentType: r.content_type,
        data: r.data,
        dataLabel: r.data_label,
      };
    });

    let newPageAfter = "";
    if (newPageState || !readingSharedAttributes) {
      let state: string;
      if (newPageState && !readingSharedAttributes) {
        state = newPageState;
      } else {
        state = `${SHARED_PREFIX}${newPageState}`;
      }
      newPageAfter = encrypt(state, this.secret);
    }

    return { attributes: items, pageAfter: newPageAfter };
  }

  async getAttribute(hash: string): Promise<AttributeResponseObject> {
    const result = await this.storageJsonrpc([
      "select * from attribute_storage where hash = ?",
      hash,
    ]);

    if (result.rows.length === 0)
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${hash} not found`,
      });

    const r = result.rows[0] as AttributeCassandraModel;
    return {
      storageUri: this.storageUri,
      hash: r.hash,
      did: r.did,
      visibility: r.visibility,
      sharedWith: r.shared_with,
      contentType: r.content_type,
      data: r.data,
      dataLabel: r.data_label,
    };
  }

  async insertAttribute(
    hash: string,
    attribute: AttributeBodyDto
  ): Promise<AttributeResponseObject> {
    await this.storageJsonrpc([
      "insert into attribute_storage (hash, did, visibility, shared_with, content_type, data, data_label) values (?, ?, ?, ?, ?, ?, ?)",
      hash,
      attribute.did,
      attribute.visibility ?? "private",
      attribute.sharedWith ?? "",
      attribute.contentType,
      attribute.data,
      attribute.dataLabel ?? "",
    ]);

    return {
      ...attribute,
      hash,
    };
  }

  async deleteAttribute(hash: string): Promise<void> {
    await this.storageJsonrpc([
      "delete from attribute_storage where hash = ?",
      hash,
    ]);
  }

  async patchAttribute(
    hash: string,
    did: string,
    patch: PatchAttributeBody[]
  ): Promise<AttributeResponseObject> {
    const oldAttribute = await this.getAttribute(hash);

    if (did !== oldAttribute.did) {
      throw new ForbiddenError(ForbiddenError.defaultTitle, {
        detail: `${did} is not the owner of attribute ${hash}`,
      });
    }

    const attribute = jsonpatch.apply_patch(oldAttribute, patch);
    await this.storageJsonrpc([
      "update attribute_storage set visibility = ?, shared_with = ?, content_type = ?, data_label = ? where hash = ?",
      attribute.visibility ?? "private",
      attribute.sharedWith ?? "",
      attribute.contentType,
      attribute.dataLabel ?? "",
      hash,
    ]);

    return attribute;
  }
}

export default { AttributesService };
