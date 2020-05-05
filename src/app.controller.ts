import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Redirect,
  UseGuards,
  Response,
  BadRequestException, UnauthorizedException, InternalServerErrorException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as status from 'http-status';

import { EthersService } from './shared/services/ethers.service';
import { AppService } from './shared/services/app.service';
import {
  AuthAppBody,
  AuthorizationBody,
  ChallengeParams,
  PublicKeyParam,
  PublicKeyParamWithAuthorizedAppName
} from './app.validator';
import { StrategyType } from './shared/auth/strategy/constants';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UnknownModuleException } from '@nestjs/core/errors/exceptions/unknown-module.exception';

const HTTP_401 = 'The client is not allowed to access resource';
const HTTP_400 = 'Bad Request';
const HTTP_404 = 'Resource not found!';
const HTTP_200 = 'Fetch Resource.';

@Controller('/trusted-apps-registry')
export class AppController {
  constructor(private readonly ethersService: EthersService, private readonly appService: AppService) {}
  // @UseGuards(AuthGuard(StrategyType.API))

  @ApiOperation({ description: 'Get all apps from the ledger (i.e. ebsi-wallet)' })
  @ApiResponse({ status: 200, description: HTTP_200})
  @ApiResponse({ status: 404, description: HTTP_404})
  @Get('/v1/apps')
  async getAllApps(@Query() query) {
    try {
      const appKeys = await this.ethersService.getApplicationKeys();
      let size = query.page ? query.page.size ?? 10 : 10;
      let after = query.page ? query.page.after ?? 0 : 0;
      let pages;

      let result = {};
      let counter = 0;
      let maxCounter = 0;
      const items = [];
      const itemStartingFrom = after * size;
      let appFromBesu;
      for (let i = 0; i < appKeys.length; i++) {
        counter++;
        if (itemStartingFrom >= counter) {
          continue;
        }
        if (maxCounter >= size) {
          continue;
        }
        appFromBesu = await this.ethersService.getApplicationByKey(appKeys[i]);
        maxCounter++;
        items.push({
          appName:  appFromBesu[0],
          pubKey: appFromBesu[1],
        });
      }

      pages = Math.ceil((counter + 1) / size);
      if ((pages - 1) < after ) {
        throw new BadRequestException('invalid page number');
      }
      result = {
        items,
        total: (counter),
        pageSize: size,
        first: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=' + size,
        prev: '/trusted-issuers-registry/v1/issuers?page[after]=' + Math.max(0, after - 1) +'&page[size]=' + size,
        next: '/trusted-issuers-registry/v1/issuers?page[after]=' + Math.min((pages-1),(after - (-1))) + '&page[size]=' + size,
        last: '/trusted-issuers-registry/v1/issuers?page[after]=' + (pages - 1) + '&page[size]=' + size,
      };
      return result;
    } catch (ex) {
      if (ex instanceof BadRequestException) {
        throw (ex);
      }
      throw new NotFoundException('Application does not exist');
    }
  }

  @ApiOperation({ description: 'Get public key of a specific App. Query is done by app-name (i.e. ebsi-wallet)' })
  @ApiResponse({ status: 200, description: HTTP_200})
  @ApiResponse({ status: 404, description: HTTP_404})
  @Get('/v1/apps/:appName')
  async get(@Param() param: PublicKeyParam) {
    try {
      const appPublicKey = await this.ethersService.getApplicationPublicKey(param.appName);
      return { appName: param.appName, pubKey: appPublicKey };
    } catch (ex) {
        if (ex instanceof InternalServerErrorException) {
          throw(ex);
        }
        throw new NotFoundException(param.appName + ' not found');
    }
  }
  // @UseGuards(AuthGuard(StrategyType.API))

  @ApiOperation({ description: 'Get get a list of authorized apps for a specific App. Query is done by app-name (i.e. ebsi-wallet)' })
  @ApiResponse({ status: 200, description: HTTP_200})
  @ApiResponse({ status: 404, description: HTTP_404})
  @Get('/v1/apps/:appName/authorized-apps')
  async getAuthApps(@Param() param: PublicKeyParam, @Query() query) {
    try {
      const authApps = await this.ethersService.getAuthorizedApps(param.appName);
      const [apps, ] = authApps;

      let size = query.page ? query.page.size ?? 10 : 10;
      let after = query.page ? query.page.after ?? 0 : 0;
      let pages;

      let result = {};
      let counter = 0;
      let maxCounter = 0;
      const items = [];
      const itemStartingFrom = after * size;
      for (let i = 0; i < apps.length; i++) {
        counter++;
        if (itemStartingFrom >= counter) {
          continue;
        }
        if (maxCounter >= size) {
          continue;
        }
        maxCounter++;
        items.push({
          authorizedAppName:  apps[i],
        });
      }

      pages = Math.ceil((counter + 1) / size);
      if ((pages - 1) < after ) {
        throw new BadRequestException('invalid page number');
      }
      result = {
        items,
        total: (counter),
        pageSize: size,
        first: '/trusted-issuers-registry/v1/issuers?page[after]=0&page[size]=' + size,
        prev: '/trusted-issuers-registry/v1/issuers?page[after]=' + Math.max(0, after - 1) +'&page[size]=' + size,
        next: '/trusted-issuers-registry/v1/issuers?page[after]=' + Math.min((pages-1),(after - (-1))) + '&page[size]=' + size,
        last: '/trusted-issuers-registry/v1/issuers?page[after]=' + (pages - 1) + '&page[size]=' + size,
      };
      return result;
    } catch (ex) {
      throw new NotFoundException('Application does not exist');
    }
  }

  @ApiOperation({ description: 'Verify if {authorizedAppName} app is authorized to consume {appName} app services.' })
  @ApiResponse({ status: 200, description: HTTP_200})
  @ApiResponse({ status: 404, description: HTTP_404})
  @Get('/v1/apps/:appName/authorized-apps/:authorizedAppName')
  async checkAppAuthorized(@Param() param: PublicKeyParamWithAuthorizedAppName) {
    try {
      const authorizedApps = await this.ethersService.getAuthorizedApps(param.appName);
      let [apps,] = authorizedApps;
      console.log(apps);
      if (apps.includes(param.authorizedAppName)) {
        return { authorizedAppName: param.authorizedAppName}
      } else {
        throw new UnauthorizedException();
      }
    } catch (ex) {
      if (ex instanceof Error) {
        throw new NotFoundException(param.authorizedAppName + ' not found in the list of authorized apps of ' + param.appName);
      }
      throw(ex);
      // throw new NotFoundException(param.appName + ' not found');
    }
  }

  @ApiOperation({ description: 'Add new app to the ledger, need app-name and public hex key.' +
      ' In order to create a new app you need to authenticate. ' +
      'To do so you need to call the challenge API with an app-name you want to add new authorization or create. ' +
      'Next step is to create an ethereum signature with your private ethereum key that is allowed to add. ' +
      'In the authorization description you need to add the challenge and the ETH signature' })
  @ApiResponse({ status: 201, description: 'Application added'})
  @ApiResponse({ status: 409, description: HTTP_400})
  @ApiResponse({ status: 400, description: HTTP_400})

  @Post('/v1/register-app')
  @HttpCode(status.CREATED)
  async postAuthorizedApp(@Body() authAppBody: AuthAppBody) {
    try {
      // authorize
      const name = await this.appService.checkLogin(authAppBody.authorize.cryptedMessage, authAppBody.authorize.signature);
      if (name !== authAppBody.name) {
        throw new UnauthorizedException('you are not authorized to insert for this DID');
      }
      return await this.ethersService.addApplication(authAppBody.pubKey, authAppBody.name);
    } catch (Error) {
      throw new BadRequestException(Error.message);
    }
  }

  @ApiOperation({ description: 'dd new authorized apps based on a specific appname.' +
      ' In order to create a new app you need to authenticate. ' +
      'To do so you need to call the challenge API with an app-name you want to add new authorization or create. ' +
      'Next step is to create an ethereum signature with your private ethereum key that is allowed to add. ' +
      'In the authorization description you need to add the challenge and the ETH signature' })
  @ApiResponse({ status: 201, description: 'Application added'})
  @ApiResponse({ status: 409, description: HTTP_400})
  @ApiResponse({ status: 400, description: HTTP_400})
  @Post('/v1/authorize')
  @HttpCode(status.CREATED)
  async postAuthorization(@Body() authBody: AuthorizationBody) {
    try {
      // authorize
      const name = await this.appService.checkLogin(authBody.authorize.cryptedMessage, authBody.authorize.signature);
      if (name !== authBody.appName) {
        throw new UnauthorizedException('you are not authorized to insert for this DID');
      }
      return await this.ethersService.addNewAuthorization(authBody.appName, authBody.authName, authBody.status);
    } catch (Error) {
      if (Error.transactionHash) {
        const revertMessage = await this.ethersService.revertMessage(Error.transactionHash);
        throw new BadRequestException(revertMessage);
      }
      throw new BadRequestException(Error.message);
    }
  }

  @ApiOperation({ description: 'Get challenge to be signed with the eth address' })
  @ApiResponse({ status: 200, description: 'Challenge encrypted'})
  @ApiResponse({ status: 404, description: HTTP_404})
  @ApiResponse({ status: 401, description: HTTP_401})
  @Get('/v1/challenge/:name')
  async challenge(@Param() params: ChallengeParams, @Response() response) {
    try {
      return response.status(200).send(this.appService.generateLoginChallenge(params.name));
    } catch (Exception) {
      throw new BadRequestException('there was a problem to process your request');
    }
  }

  @Get('/swagger.json')
  async getSwagger(@Response() response) {
    return response.redirect('/ebsitrustedapp/api-docs-json');
  }
}
