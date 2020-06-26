import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Response } from "express";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { EthersService } from "./services/ethers.service";
import { AppService } from "./services/app.service";
import {
  AuthAppBody,
  AuthorizationBody,
  ChallengeParams,
  PublicKeyParam,
  PublicKeyParamWithAuthorizedAppName,
} from "./validators";

const HTTP_401 = "The client is not allowed to access resource";
const HTTP_400 = "Bad Request";
const HTTP_404 = "Resource not found!";
const HTTP_200 = "Fetch Resource.";

@Controller("/trusted-apps-registry")
export class AppController {
  constructor(
    private readonly ethersService: EthersService,
    private readonly appService: AppService
  ) {}

  @ApiOperation({
    description: "Get all apps from the ledger (i.e. ebsi-wallet)",
  })
  @ApiResponse({ status: 200, description: HTTP_200 })
  @ApiResponse({ status: 404, description: HTTP_404 })
  @Get("/v1/apps")
  async getAllApps(@Query() query) {
    try {
      const appKeys = await this.ethersService.getApplicationKeys();

      const size = parseInt(query.page ? query.page.size ?? 10 : 10, 10);
      const after = parseInt(query.page ? query.page.after ?? 0 : 0, 10);

      const counter = appKeys.length;
      const itemStartingFrom = after * size;
      const queue = [];
      for (let i = 0; i < size && i < counter; i += 1) {
        queue.push(async () => {
          const appFromBesu = await this.ethersService.getApplicationByKey(
            appKeys[itemStartingFrom + i]
          );
          return {
            appName: appFromBesu[0],
            pubKey: appFromBesu[1],
          };
        });
      }

      const items = await Promise.all(queue.map(async (task) => task()));
      const pages = Math.ceil((counter + 1) / size);

      if (pages - 1 < after) {
        throw new BadRequestException("invalid page number");
      }

      const result = {
        items,
        total: counter,
        pageSize: size,
        links: {
          first: `/trusted-apps-registry/v1/apps?page[after]=0&page[size]=${size}`,
          prev: `/trusted-apps-registry/v1/apps?page[after]=${Math.max(
            0,
            after - 1
          )}&page[size]=${size}`,
          next: `/trusted-apps-registry/v1/apps?page[after]=${Math.min(
            pages - 1,
            after - -1
          )}&page[size]=${size}`,
          last: `/trusted-apps-registry/v1/apps?page[after]=${
            pages - 1
          }&page[size]=${size}`,
        },
      };

      return result;
    } catch (ex) {
      if (ex instanceof BadRequestException) {
        throw ex;
      }
      throw new NotFoundException("Application does not exist");
    }
  }

  @ApiOperation({
    description:
      "Get public key of a specific App. Query is done by app-name (i.e. ebsi-wallet)",
  })
  @ApiResponse({ status: 200, description: HTTP_200 })
  @ApiResponse({ status: 404, description: HTTP_404 })
  @Get("/v1/apps/:appName")
  async get(@Param() param: PublicKeyParam) {
    try {
      const appPublicKey = await this.ethersService.getApplicationPublicKey(
        param.appName
      );
      return { appName: param.appName, pubKey: appPublicKey };
    } catch (ex) {
      if (ex instanceof InternalServerErrorException) {
        throw ex;
      }
      throw new NotFoundException(`${param.appName} not found`);
    }
  }

  @ApiOperation({
    description:
      "Get a list of authorized apps for a specific App. Query is done by app-name (i.e. ebsi-wallet)",
  })
  @ApiResponse({ status: 200, description: HTTP_200 })
  @ApiResponse({ status: 404, description: HTTP_404 })
  @Get("/v1/apps/:appName/authorized-apps")
  async getAuthApps(@Param() param: PublicKeyParam, @Query() query) {
    try {
      const apps = await this.ethersService.getAuthorizedApps(param.appName);

      if (apps.length === 0) {
        throw new NotFoundException("no application found");
      }

      const size = parseInt(query.page ? query.page.size ?? 10 : 10, 10);
      const after = parseInt(query.page ? query.page.after ?? 0 : 0, 10);

      let result = {};
      const items = [];
      const itemStartingFrom = after * size;
      const counter = apps.length;

      for (let i = 0; i < size && i < counter; i += 1) {
        items.push({
          authorizedAppName: apps[itemStartingFrom + i],
        });
      }

      const pages = Math.ceil((counter + 1) / size);
      if (pages - 1 < after) {
        throw new BadRequestException("invalid page number");
      }
      result = {
        items,
        total: counter,
        pageSize: size,
        links: {
          first: `/trusted-apps-registry/v1/apps?page[after]=0&page[size]=${size}`,
          prev: `/trusted-apps-registry/v1/apps?page[after]=${Math.max(
            0,
            after - 1
          )}&page[size]=${size}`,
          next: `/trusted-apps-registry/v1/apps?page[after]=${Math.min(
            pages - 1,
            after - -1
          )}&page[size]=${size}`,
          last: `/trusted-apps-registry/v1/apps?page[after]=${
            pages - 1
          }&page[size]=${size}`,
        },
      };
      return result;
    } catch (ex) {
      throw new NotFoundException("Application does not exist");
    }
  }

  @ApiOperation({
    description:
      "Verify if {authorizedAppName} app is authorized to consume {appName} app services.",
  })
  @ApiResponse({ status: 200, description: HTTP_200 })
  @ApiResponse({ status: 404, description: HTTP_404 })
  @Get("/v1/apps/:appName/authorized-apps/:authorizedAppName")
  async checkAppAuthorized(
    @Param() param: PublicKeyParamWithAuthorizedAppName
  ) {
    try {
      const apps = await this.ethersService.getAuthorizedApps(param.appName);

      if (apps.includes(param.authorizedAppName)) {
        return { authorizedAppName: param.authorizedAppName };
      }
      throw new UnauthorizedException();
    } catch (error) {
      if (error instanceof Error) {
        throw new NotFoundException(
          `${param.authorizedAppName} not found in the list of authorized apps of ${param.appName}`
        );
      }
      throw error;
    }
  }

  @ApiOperation({
    description: `
      Add new app to the ledger, need app-name and public hex key.
      In order to create a new app you need to authenticate.
      To do so, you need to call the challenge API with an app-name you want to add new authorization or create.
      Next step is to create an ethereum signature with your private ethereum key that is allowed to add.
      In the authorization description you need to add the challenge and the ETH signature.
    `,
  })
  @ApiResponse({ status: 201, description: "Application added" })
  @ApiResponse({ status: 409, description: HTTP_400 })
  @ApiResponse({ status: 400, description: HTTP_400 })
  @Post("/v1/register-app")
  @HttpCode(HttpStatus.CREATED)
  async postAuthorizedApp(@Body() authAppBody: AuthAppBody) {
    let name;
    try {
      // authorize
      name = await this.appService.checkLogin(
        authAppBody.authorize.cryptedMessage,
        authAppBody.authorize.signature
      );
    } catch (err) {
      throw new BadRequestException(err.message);
    }

    if (name !== authAppBody.name) {
      throw new UnauthorizedException(
        "You are not authorized to insert for this DID"
      );
    }

    try {
      return await this.ethersService.addApplication(
        authAppBody.pubKey,
        authAppBody.name
      );
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  @ApiOperation({
    description: `
      Add new authorized apps based on a specific app-name.
      In order to create a new app, you need to authenticate.
      To do so, you need to call the challenge API with an app-name you want to add new authorization or create.
      Next step is to create an ethereum signature with your private ethereum key that is allowed to add.
      In the authorization description, you need to add the challenge and the ETH signature.
    `,
  })
  @ApiResponse({ status: 201, description: "Application added" })
  @ApiResponse({ status: 409, description: HTTP_400 })
  @ApiResponse({ status: 400, description: HTTP_400 })
  @Post("/v1/authorize")
  @HttpCode(HttpStatus.CREATED)
  async postAuthorization(@Body() authBody: AuthorizationBody) {
    let name;

    try {
      // authorize
      name = await this.appService.checkLogin(
        authBody.authorize.cryptedMessage,
        authBody.authorize.signature
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    if (name !== authBody.appName) {
      throw new UnauthorizedException(
        "You are not authorized to insert for this DID"
      );
    }

    try {
      return await this.ethersService.addNewAuthorization(
        authBody.appName,
        authBody.authName,
        authBody.status
      );
    } catch (error) {
      if (error.transactionHash) {
        const revertMessage = await this.ethersService.revertMessage(
          error.transactionHash
        );

        throw new BadRequestException(revertMessage);
      }

      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({
    description: "Get challenge to be signed with the eth address",
  })
  @ApiResponse({ status: 200, description: "Challenge encrypted" })
  @ApiResponse({ status: 404, description: HTTP_404 })
  @ApiResponse({ status: 401, description: HTTP_401 })
  @Get("/v1/challenge/:name")
  challenge(@Param() params: ChallengeParams, @Res() response: Response) {
    try {
      const res = this.appService.generateLoginChallenge(params.name);
      return response.status(200).send(res);
    } catch (e) {
      throw new BadRequestException(
        "There was a problem to process your request"
      );
    }
  }
}

export default AppController;
