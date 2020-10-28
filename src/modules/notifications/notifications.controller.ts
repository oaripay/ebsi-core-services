import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  Response,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyReply } from "fastify";
import { NotificationsService } from "./notifications.service";
import {
  PaginatedResponse,
  Notification,
  NotificationWithLinks,
} from "./notifications.interface";
import { ConfigObject } from "../../config/configuration";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { PaginationQuery } from "./dto/pagination-query.dto";

@Controller("/notifications")
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  private baseUrl: string;

  constructor(
    private notificationsService: NotificationsService,
    private configService: ConfigService<ConfigObject>
  ) {
    const apiUrlPrefix = configService.get<string>("apiUrlPrefix");
    const apiUrlOrigin = configService.get<string>("apiUrlOrigin");
    this.baseUrl = `${apiUrlOrigin}${apiUrlPrefix}/notifications`;
  }

  @Post("")
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
    @Response() res: FastifyReply
  ): Promise<FastifyReply> {
    const { notification, id } = await this.notificationsService.create(
      createNotificationDto
    );

    const location = `${this.baseUrl}/${id}`;

    return res.code(201).header("Location", location).send(notification);
  }

  @Get("")
  async findAll(
    @Query() query: PaginationQuery,
    @Response() res: FastifyReply
  ): Promise<FastifyReply> {
    const notifications: PaginatedResponse<NotificationWithLinks> = await this.notificationsService.findAll(
      query["page[after]"],
      query["page[size]"],
      this.baseUrl
    );

    return res.code(200).send(notifications);
  }

  @Get("/:id")
  async find(
    @Param() params: { id: string },
    @Response() res: FastifyReply
  ): Promise<FastifyReply> {
    const { id } = params;
    const notification: Notification = await this.notificationsService.find(id);
    return res.code(200).send(notification);
  }

  @Delete("/:id")
  async delete(
    @Param() params: { id: string },
    @Response() res: FastifyReply
  ): Promise<FastifyReply> {
    const { id } = params;
    await this.notificationsService.delete(id);
    return res.code(204).send();
  }
}

export default NotificationsController;
