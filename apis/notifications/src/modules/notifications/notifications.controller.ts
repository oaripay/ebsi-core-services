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
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyReply } from "fastify";
import {
  BadRequestError,
  ForbiddenError,
  PaginatedList2,
} from "@ebsiint-api/shared";
import { NotificationsService } from "./notifications.service.js";
import {
  Notification,
  NotificationResponseObject,
} from "./notifications.interface.js";
import { JwtAuthGuard } from "../auth/guards/index.js";
import { User, type UserInfo } from "../auth/decorators/index.js";
import type { ApiConfig } from "../../config/configuration.js";
import { CreateNotificationDto } from "./dto/create-notification.dto.js";
import { formatNotifications } from "./notifications.formatter.js";
import { GetNotificationsDto } from "./dto/get-attributes.dto.js";

@Controller("/notifications")
export class NotificationsController {
  private baseUrl: string;

  constructor(
    private notificationsService: NotificationsService,
    private configService: ConfigService<ApiConfig, true>,
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
    @Response() res: FastifyReply,
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
    @User() user: UserInfo,
  ): Promise<PaginatedList2<NotificationResponseObject>> {
    const currentPage = query["page[after]"];
    const pageSize = query["page[size]"];

    const {
      notifications,
      pageAfter: nextPage,
      total,
    } = await this.notificationsService.getNotifications(
      user.did,
      currentPage,
      pageSize,
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
      total,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("/:id")
  async getNotification(
    @Param() params: { id: string },
    @User() user: UserInfo,
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
    @User() user: UserInfo,
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
