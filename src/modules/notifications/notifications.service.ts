import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { classToPlain } from "class-transformer";
import {
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from "@cef-ebsi/problem-details-errors";
import axios, { AxiosError, AxiosResponse } from "axios";
import crypto, { randomUUID } from "crypto";
import { decodeJWT } from "did-jwt";
import { Agent, AkeResponse } from "@cef-ebsi/oauth2-auth";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { ApiConfig } from "../../config/configuration";
import {
  Notification,
  NotificationResponseObject,
  NotificationCassandraModel,
  CassandraResponse,
  PageOpts,
  AxiosResponseJsonRpc,
} from "./notifications.interface";
import { encrypt, decrypt, logAxiosError } from "../../shared/utils";

const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

// Refresh the token if it expires in less than 10 seconds
const REFRESH_LIMIT = 10 * 1000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private urlJsonrpcStorage: string;

  private secret: string;

  private storageApiUrl: string;

  private didRegistryApiUrl: string;

  private accessTokenExp: number;

  private accessToken: string;

  private agent: Agent;

  private authorisationApiUrl: string;

  private notificationsUrl: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.secret = this.configService.get<string>("encryptionSecret");
    this.storageApiUrl = this.configService.get("storageApiUrl");
    this.urlJsonrpcStorage = `${this.storageApiUrl}/stores/distributed/jsonrpc`;
    this.didRegistryApiUrl = this.configService.get("didRegistryApiUrl");

    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    const domain = configService.get<string>("domain");
    this.notificationsUrl = `${domain}${apiUrlPrefix}/notifications`;

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
    const nonce = randomUUID();

    const requestComponent = await this.agent.createRequestPayload(
      this.configService.get<string>("storageApiName"),
      { nonce }
    );

    // Send request payload to Authorisation API
    try {
      const res = await axios.post<
        typeof requestComponent,
        AxiosResponse<AkeResponse>
      >(`${this.authorisationApiUrl}/oauth2-sessions`, requestComponent);

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
    params: (string | number | PageOpts)[]
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

  async insertNotification(
    createNotificationDto: CreateNotificationDto
  ): Promise<{ notification: Notification; id: string | number }> {
    // Transform DTO to plain object to be stored
    const notification = classToPlain(createNotificationDto) as Notification;

    const { from, to, issuanceDate } = notification;
    let { expirationDate } = notification;
    const message = JSON.stringify(notification);
    if (
      expirationDate &&
      new Date(expirationDate).getTime() - new Date(issuanceDate).getTime() >
        FIVE_DAYS
    )
      throw new BadRequestError("Invalid Expiration Date", {
        detail: `The expiration date can not be greater than 5 days of issuance`,
      });
    if (!expirationDate)
      expirationDate = new Date(
        new Date(issuanceDate).getTime() + FIVE_DAYS
      ).toISOString();

    // verify if "to" is in the did registry
    try {
      await axios.get(`${this.didRegistryApiUrl}/identifiers/${to}`);
    } catch (error) {
      throw new BadRequestError(`${to} is not registered in the DID Registry`);
    }

    // Generate ID
    const id = crypto
      .createHash("sha3-256")
      .update(message, "utf8")
      .digest("hex");

    // calculate ttl
    const ttl = Math.trunc(
      (new Date(expirationDate).getTime() - new Date(issuanceDate).getTime()) /
        1000
    );

    await this.storageJsonrpc([
      "insert into notification_storage (id, sender, receiver, message) values (?, ?, ?, ?) using ttl ?",
      id,
      from,
      to,
      message,
      ttl,
    ]);

    return { notification, id };
  }

  async getNotifications(
    did: string,
    pageAfter: string,
    fetchSize: number
  ): Promise<{
    notifications: NotificationResponseObject[];
    pageAfter: string;
    total: number;
  }> {
    // Note: The page state token can be manipulated to retrieve other results within the same
    // column family, so it is not safe to expose it to the users in plain text.
    // https://docs.datastax.com/en/developer/nodejs-driver/4.6/features/paging/
    let pageState = "";
    if (pageAfter) {
      try {
        pageState = decrypt(pageAfter, this.secret);
      } catch (e) {
        this.logger.error((e as Error).message, (e as Error).stack);
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: "Invalid page[after] parameter",
        });
      }
    }

    const result = await this.storageJsonrpc([
      "select * from notification_storage where receiver = ? allow filtering",
      did,
      {
        ...(fetchSize && { fetchSize }),
        ...(pageState && pageState !== "null" && { pageState }),
      },
    ]);

    const resultCount = await this.storageJsonrpc([
      "select count(*) from notification_storage where receiver = ? allow filtering",
      did,
    ]);

    const { pageState: newPageState, rows: cassandraNotifications } = result;
    let newPageAfter = "";
    if (newPageState) newPageAfter = encrypt(newPageState, this.secret);

    const { rows: rowsCount } = resultCount;
    const total = Number((rowsCount[0] as { count: string }).count);

    // Add _links to the notifications
    const notifications = cassandraNotifications.map(
      (cassandraNotification: NotificationCassandraModel) => {
        const notification = JSON.parse(
          cassandraNotification.message
        ) as Notification;
        return {
          ...notification,
          _links: {
            self: {
              href: `${this.notificationsUrl}/${cassandraNotification.id}`,
            },
          },
        };
      }
    );

    notifications.sort((a, b) => (a.issuanceDate > b.issuanceDate ? 1 : -1));

    return { notifications, pageAfter: newPageAfter, total };
  }

  async getNotification(id: string): Promise<Notification> {
    const result = await this.storageJsonrpc([
      "select * from notification_storage where id = ?",
      id,
    ]);

    if (result.rows.length === 0)
      throw new NotFoundError("Notification Not Found", {
        detail: `Notification ${id} not found`,
      });

    const r = result.rows[0] as NotificationCassandraModel;
    return JSON.parse(r.message) as Notification;
  }

  async deleteNotification(id: string): Promise<void> {
    await this.storageJsonrpc([
      "delete from notification_storage where id = ?",
      id,
    ]);
  }
}

export default NotificationsService;
