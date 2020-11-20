import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { classToPlain } from "class-transformer";
import { BadRequestError } from "@cef-ebsi/problem-details-errors";
import crypto from "crypto";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import {
  PaginatedResponse,
  Notification,
  NotificationWithLinks,
} from "./notifications.interface";
import { formatPaginatedResponse } from "./notifications.utils";
import { CassandraService } from "../cassandra/cassandra.service";

const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

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
    did: string,
    page: number,
    pageSize: number,
    baseUrl: string
  ): Promise<PaginatedResponse<NotificationWithLinks>> {
    const notifications = await this.cassandraService.getNotifications(did);
    // Add _links to the notifications
    const notificationWithLinks = notifications.map((notification) => {
      const returnNotification = JSON.parse(
        notification.message
      ) as Notification;
      return {
        ...returnNotification,
        _links: {
          self: { href: `${baseUrl}/${notification.id}` },
        },
      };
    });
    notificationWithLinks.sort((a, b) =>
      a.issuanceDate > b.issuanceDate ? 1 : -1
    );
    return formatPaginatedResponse<NotificationWithLinks>(
      notificationWithLinks,
      baseUrl,
      page,
      pageSize,
      notificationWithLinks.length
    );
  }

  async find(did: string, id: string): Promise<Notification> {
    const storedNotification = await this.cassandraService.getNotification(
      did,
      id
    );
    return JSON.parse(storedNotification.message) as Notification;
  }

  async delete(to: string, id: string): Promise<void> {
    await this.cassandraService.deleteNotification(to, id);
  }
}
export default NotificationsService;
