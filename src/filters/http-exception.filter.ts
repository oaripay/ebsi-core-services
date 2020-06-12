import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";

@Catch()
export default class AllExceptionsFilter implements ExceptionFilter {
  // eslint-disable-next-line class-methods-use-this
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    // const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let title;
    switch (exception.constructor) {
      case BadRequestException:
        title = "Bad Request";
        break;
      case UnauthorizedException:
        title = "Unauthorized";
        break;
      case NotFoundException:
        title = "Not Found";
        break;
      case InternalServerErrorException:
        title = "Internal Server Error";
        break;
      default:
        title = "Unkown Error";
    }

    response.status(status).json({
      title,
      status,
      detail: exception.message,
    });
  }
}
