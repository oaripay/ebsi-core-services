import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Param,
  Response,
  HttpCode,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyReply } from "fastify";
import {
  BadRequestError,
  ForbiddenError,
} from "@cef-ebsi/problem-details-errors";
import { NotificationsService } from "./notifications.service";
import {
  Notification,
  NotificationResponseObject,
} from "./notifications.interface";
import { JwtAuthGuard } from "../auth/guards";
import { User, UserInfo } from "../auth/decorators";
import { ApiConfig } from "../../config/configuration";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { formatNotifications } from "./notifications.formatter";
import { PaginatedList } from "../../shared/interfaces";
import { GetNotificationsDto } from "./dto/get-attributes.dto";

@Controller("/notifications")
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  private baseUrl: string;

  constructor(
    private notificationsService: NotificationsService,
    private configService: ConfigService<ApiConfig>
  ) {
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    const domain = configService.get<string>("domain");
    this.baseUrl = `${domain}${apiUrlPrefix}/notifications`;
  }

  @UseGuards(JwtAuthGuard)
  @Post("")
  async insertNotification(
    @Body() createNotificationDto: CreateNotificationDto,
    @User() user: UserInfo,
    @Response() res: FastifyReply
  ): Promise<FastifyReply> {
    if (user.did !== createNotificationDto.from)
      throw new BadRequestError("DID Mismatch", {
        detail: `DID Mismatch: The did of the Bearer token (${user.did}) must be equal to the did in the from field (${createNotificationDto.from})`,
      });

    const { notification, id } =
      await this.notificationsService.insertNotification(createNotificationDto);

    const location = `${this.baseUrl}/${id}`;

    return res.code(201).header("Location", location).send(notification);
  }

  @UseGuards(JwtAuthGuard)
  @Get("")
  async getNotifications(
    @Query() query: GetNotificationsDto,
    @User() user: UserInfo
  ): Promise<PaginatedList<NotificationResponseObject>> {
    const currentPage = query["page[after]"];
    const pageSize = query["page[size]"];

    const {
      notifications,
      pageAfter: nextPage,
      total,
    } = await this.notificationsService.getNotifications(
      user.did,
      currentPage,
      pageSize
    );

    const apiUrlPrefix = this.configService.get<string>("apiUrlPrefix");
    const domain = this.configService.get<string>("domain");
    const baseUrl = `${domain}${apiUrlPrefix}/notifications`;

    return formatNotifications(
      notifications,
      currentPage,
      nextPage,
      pageSize,
      baseUrl,
      total
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("/:id")
  async getNotification(
    @Param() params: { id: string },
    @User() user: UserInfo
  ): Promise<Notification> {
    const { id } = params;
    const notification = await this.notificationsService.getNotification(id);
    if (notification.to !== user.did)
      throw new ForbiddenError(ForbiddenError.defaultTitle, {
        detail: `The notification was not sent to ${user.did}`,
      });
    return notification;
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @Delete("/:id")
  async deleteNotification(
    @Param() params: { id: string },
    @User() user: UserInfo
  ): Promise<void> {
    const { id } = params;

    const notification = await this.notificationsService.getNotification(id);

    if (notification.to !== user.did)
      throw new ForbiddenError(ForbiddenError.defaultTitle, {
        detail: `The notification was not sent to ${user.did}`,
      });

    await this.notificationsService.deleteNotification(id);
  }
}

export default NotificationsController;
