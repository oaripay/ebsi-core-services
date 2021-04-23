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
  Req,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyRequest, FastifyReply } from "fastify";
import jwtDecode from "jwt-decode";
import { NotificationsService } from "./notifications.service";
import {
  PaginatedResponse,
  Notification,
  NotificationWithLinks,
  DecodedToken,
} from "./notifications.interface";
import { ApiConfig } from "../../config/configuration";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { PaginationQuery } from "./dto/pagination-query.dto";

@Controller("/notifications")
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  private baseUrl: string;

  constructor(
    private notificationsService: NotificationsService,
    private configService: ConfigService<ApiConfig>
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
    @Req() request: FastifyRequest,
    @Query() query: PaginationQuery,
    @Response() res: FastifyReply
  ): Promise<FastifyReply> {
    // TODO implement proper middleware to handle the token
    const { headers } = request;
    const decodedToken = jwtDecode(headers.authorization);
    const notifications: PaginatedResponse<NotificationWithLinks> = await this.notificationsService.findAll(
      (decodedToken as DecodedToken).did,
      query["page[after]"],
      query["page[size]"],
      this.baseUrl
    );
    return res.code(200).send(notifications);
  }

  @Get("/:id")
  async find(
    @Req() request: FastifyRequest,
    @Param() params: { id: string },
    @Response() res: FastifyReply
  ): Promise<FastifyReply> {
    // TODO implement proper middleware to handle the token
    const { headers } = request;
    const decodedToken = jwtDecode(headers.authorization);
    const { id } = params;
    const notification: Notification = await this.notificationsService.find(
      (decodedToken as DecodedToken).did,
      id
    );
    return res.code(200).send(notification);
  }

  @Delete("/:id")
  async delete(
    @Req() request: FastifyRequest,
    @Param() params: { id: string },
    @Response() res: FastifyReply
  ): Promise<FastifyReply> {
    const { headers } = request;
    const decodedToken = jwtDecode(headers.authorization);
    const { id } = params;
    await this.notificationsService.delete(
      (decodedToken as DecodedToken).did,
      id
    );
    return res.code(204).send();
  }
}

export default NotificationsController;
