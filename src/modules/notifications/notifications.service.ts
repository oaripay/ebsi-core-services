import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { classToPlain } from "class-transformer";
import crypto from "crypto";
import { CassandraService } from "../cassandra/cassandra.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import {
  PaginatedResponse,
  Notification,
  NotificationWithLinks,
} from "./notifications.interface";
import {
  getPaginationIndices,
  formatPaginatedResponse,
} from "./notifications.utils";

// Fake content until we pull it from Cassandra
const fakeNotifications: Notification[] = [
  {
    schemaId: "notifications-001",
    type: ["Notification", "StoreVerfiableCredential"],
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://essif.europa.eu/schemas/vc/2020/v1",
      "https://essif.europa.eu/schemas/notifications/2020/v1",
    ],
    from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
    issuanceDate: "2019-06-22T14:11:44Z",
    expirationDate: "2019-06-27T14:11:44Z",
    payload: {},
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: "2019-11-17T14:00:00Z",
      proofPurpose: "assertionMethod",
      verificationMethod:
        "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657#key-1",
      jws: "eyJh..Iw",
    },
  },
  {
    schemaId: "102",
    type: ["Notification", "RequestVerifiablePresentation"],
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://essif.europa.eu/schemas/vc/2020/v1",
      "https://essif.europa.eu/schemas/notifications/2020/v1",
    ],
    from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
    issuanceDate: "2019-06-22T14:11:44Z",
    expirationDate: "2019-06-27T14:11:44Z",
    payload: {},
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      created: "2019-11-17T14:00:00Z",
      proofPurpose: "assertionMethod",
      verificationMethod:
        "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657#key-1",
      jws: "eyJh..Iw",
    },
  },
];

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private configService: ConfigService,
    private cassandraService: CassandraService
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto
  ): Promise<{ notification: Notification; id: string | number }> {
    // Transform DTO to plain object to be stored
    const notification = classToPlain(createNotificationDto) as Notification;

    const { from, to, issuanceDate, expirationDate } = notification;
    const message = JSON.stringify(notification);

    // Generate ID
    const id = crypto
      .createHash("sha3-256")
      .update(message, "utf8")
      .digest("hex");

    // Store notification to Cassandra
    await this.cassandraService.insertNotification(
      id,
      issuanceDate,
      expirationDate,
      from,
      to,
      message
    );

    return { notification, id };
  }

  async findAll(
    page: number,
    pageSize: number,
    baseUrl: string
  ): Promise<PaginatedResponse<NotificationWithLinks>> {
    await Promise.resolve();
    const total = fakeNotifications.length;

    const indices = getPaginationIndices(total, page, pageSize);

    // Add _links to the notifications
    const notificationWithLinks = fakeNotifications.map((notification) => {
      // Compute ID dynamically
      // In practice, it will be returned by Cassandra
      const id = crypto
        .createHash("sha3-256")
        .update(JSON.stringify(notification), "utf8")
        .digest("hex");

      return {
        ...notification,
        _links: {
          self: { href: `${baseUrl}/${id}` },
        },
      };
    });

    return formatPaginatedResponse<NotificationWithLinks>(
      notificationWithLinks,
      baseUrl,
      page,
      pageSize,
      total,
      indices
    );
  }

  async find(id: string): Promise<Notification> {
    await Promise.resolve(id);
    const notification: Notification = fakeNotifications[0];
    return notification;
  }

  async delete(id: string): Promise<void> {
    await Promise.resolve(id);
  }
}

export default NotificationsService;
