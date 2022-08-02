import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { ethers } from "ethers";
import { Tar } from "@ebsiint-sc/trusted-apps-registry";
import LedgerService from "../ledger/ledger.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import {
  AppResponseObject,
  AuthorizationItemObject,
  AuthorizationResponseObject,
  PublicKeyResponseObject,
} from "./apps.interface";

const domainName = ["undefined", "ebsi", "external"];
const statusName = ["undefined", "active", "revoked", "suspended"];
const permissionToString = (permissionNumber) =>
  permissionNumber === "1" ? "true" : "false";

@Injectable()
export default class AppsService {
  private readonly logger = new Logger(AppsService.name);

  private tarContract: Tar;

  constructor(private ledgerService: LedgerService) {}

  getContract() {
    if (!this.tarContract) {
      this.tarContract = this.ledgerService.getContract();
    }

    return this.tarContract;
  }

  async getPage(
    fnName: string,
    params: string[],
    page: number
  ): Promise<{ items: unknown[]; total: ethers.BigNumber }> {
    switch (fnName) {
      case "getAppAdministratorIds": {
        const { items, total } =
          await this.getContract().getAppAdministratorIds(params[0], page, 50);
        return { items, total };
      }
      case "getAppPublicKeyIds": {
        const { items, total } = await this.getContract().getAppPublicKeyIds(
          params[0],
          page,
          50
        );
        return { items, total };
      }
      case "getAppInfoIds": {
        const { items, total } = await this.getContract().getAppInfoIds(
          params[0],
          page,
          50
        );
        return { items, total };
      }
      default:
        throw new Error(`TAR function ${fnName} not implemented`);
    }
  }

  async getAllPages(fnName: string, params: string[]): Promise<unknown> {
    const { items, total } = await this.getPage(fnName, params, 1);
    const lastPage = Math.ceil(total.toNumber() / 50);
    const promisesNextPages = Array.from(
      { length: lastPage - 1 },
      (x, i) => i + 2
    ).map(async (i) => {
      const { items: pagItems } = await this.getPage(fnName, params, i);
      return pagItems;
    });
    const itemsNextPages = await Promise.all(promisesNextPages);
    itemsNextPages.forEach((pagItems) => {
      items.splice(items.length, 0, ...pagItems);
    });
    return items;
  }

  async getApps(page: number, pageSize: number): ReturnType<Tar["getApps"]> {
    return this.getContract().getApps(page, pageSize);
  }

  async getAppByName(appName: string): ReturnType<Tar["getAppByName"]> {
    try {
      const app = await this.getContract().getAppByName(appName);
      return app;
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundError("App Not Found", {
        detail: `App ${appName} not found`,
      });
    }
  }

  async getAppByPublicKeyId(
    publicKeyId: string
  ): ReturnType<Tar["getAppByPublicKeyId"]> {
    return this.getContract().getAppByPublicKeyId(publicKeyId);
  }

  async getAppById(applicationId: string): ReturnType<Tar["getAppById"]> {
    return this.getContract().getAppById(applicationId);
  }

  async getApp(appName: string): Promise<AppResponseObject> {
    const app: AsyncReturnType<Tar["getAppByName"]> = await this.getAppByName(
      appName
    );

    const [applicationId, domain] = app;

    const administrators = (await this.getAllPages("getAppAdministratorIds", [
      applicationId,
    ])) as string[];
    const publicKeyIds = (await this.getAllPages("getAppPublicKeyIds", [
      applicationId,
    ])) as string[];
    const publicKeys = await Promise.all(
      publicKeyIds.map(async (publicKeyId) => {
        const { publicKey } = await this.getContract().getPublicKey(
          publicKeyId
        );
        return Buffer.from(publicKey.slice(2), "hex").toString("base64");
      })
    );
    const infoIds = (await this.getAllPages("getAppInfoIds", [
      applicationId,
    ])) as string[];
    let info = {};
    if (infoIds.length > 0) {
      const infoBytes = await this.getContract().getAppInfoByInfoId(
        infoIds[infoIds.length - 1]
      );
      const infoStr = Buffer.from(infoBytes.slice(2), "hex").toString("utf8");
      info = JSON.parse(infoStr) as { [x: string]: unknown };
    }
    const authorizationItems = await this.getAllAuthorizations(applicationId);
    const authorizations = await Promise.all(
      authorizationItems.map(async (auth) =>
        this.getAuthorization(appName, auth.authorizationId)
      )
    );
    const revocationStatus = await this.getAppRevocationStatus(applicationId);
    const revocation = revocationStatus
      ? {
          revokedBy: revocationStatus.revokedBy,
          notBefore: revocationStatus.notBefore.toNumber(),
        }
      : null;

    return {
      applicationId,
      name: appName,
      domain: domainName[domain],
      administrators,
      publicKeys,
      info,
      authorizations,
      revocation,
    };
  }

  async getAppRevocationStatus(
    applicationId: string
  ): ReturnType<Tar["getRevocation"]> {
    try {
      const revocationStatus = await this.getContract().getRevocation(
        applicationId
      );
      return revocationStatus;
    } catch {
      return null;
    }
  }

  async getPublicKeys(
    appName: string,
    page: number,
    pageSize: number
  ): ReturnType<Tar["getAppPublicKeyIds"]> {
    const app: AsyncReturnType<Tar["getAppByName"]> = await this.getAppByName(
      appName
    );
    const [applicationId] = app;
    return this.getContract().getAppPublicKeyIds(applicationId, page, pageSize);
  }

  async getPublicKey(
    appName: string,
    publicKeyId: string
  ): Promise<PublicKeyResponseObject> {
    let result: AsyncReturnType<Tar["getPublicKey"]>;
    const app: AsyncReturnType<Tar["getAppByName"]> = await this.getAppByName(
      appName
    );
    const [applicationId] = app;
    try {
      result = await this.getContract().getPublicKey(publicKeyId);
    } catch (error) {
      throw new NotFoundError("Public Key Not Found", {
        detail: `Public key ${publicKeyId} not found`,
      });
    }
    const { appId, publicKey, status, notBefore, notAfter } = result;
    if (appId !== applicationId)
      throw new NotFoundError("Public Key Not Found", {
        detail: `Public key ${publicKeyId} is not owned by ${appName}`,
      });

    return {
      applicationId,
      publicKey: Buffer.from(publicKey.slice(2), "hex").toString("base64"),
      status: statusName[status],
      notBefore: notBefore.toNumber(),
      notAfter: notAfter.toNumber(),
    };
  }

  async getAllAuthorizations(
    resourceApplicationId: string
  ): Promise<AuthorizationItemObject[]> {
    let authorizedAppsIds: AsyncReturnType<Tar["getAuthorizedAppsIds"]>;
    try {
      // TODO on SC: remove require when there are no authorizations
      authorizedAppsIds = await this.getContract().getAuthorizedAppsIds(
        resourceApplicationId,
        1,
        50
      );
    } catch (error) {
      /* empty */
    }

    // remove duplications - TODO on SC
    let itemsApp = [];
    let lastPageApp = 0;
    if (authorizedAppsIds) {
      itemsApp = authorizedAppsIds.items.filter(
        (app, index, self) => self.indexOf(app) === index
      );
      lastPageApp = Math.ceil(authorizedAppsIds.items.length / 50);
    }

    const promisesNextPagesApp = Array.from(
      { length: lastPageApp - 1 },
      (x, i) => i + 2
    ).map(async (i) => {
      let auths: AsyncReturnType<Tar["getAuthorizedAppsIds"]>;
      try {
        auths = await this.getContract().getAuthorizedAppsIds(
          resourceApplicationId,
          i,
          50
        );
      } catch (error) {
        /* empty */
      }
      if (!auths) {
        return {
          items: [],
          total: ethers.BigNumber.from(0),
        };
      }
      return auths;
    });
    const allNextPagesApp = await Promise.all(promisesNextPagesApp);
    allNextPagesApp.forEach((pageResult) => itemsApp.push(...pageResult.items));

    const promisesAuths = itemsApp.map(async (authorizedAppId: string) => {
      // get name
      const app = await this.getContract().getAppById(authorizedAppId);
      const authorizedAppName = app.name;

      // get auths
      const auths = await this.getContract().getAuthorizations(
        resourceApplicationId,
        authorizedAppId,
        1,
        50
      );
      const authIds = auths.items;
      const lastPageAuth = Math.ceil(auths.total.toNumber() / 50);
      const promisesNextPagesAuth = Array.from(
        { length: lastPageAuth - 1 },
        (x, i) => i + 2
      ).map((i) =>
        this.getContract().getAuthorizations(
          resourceApplicationId,
          authorizedAppId,
          i,
          50
        )
      );
      const allNextPagesAuth = await Promise.all(promisesNextPagesAuth);
      allNextPagesAuth.forEach((pageResult) =>
        authIds.push(...pageResult.items)
      );
      return authIds.map((authorizationId) => ({
        authorizationId,
        authorizedAppName,
      }));
    });

    const allAppAuths = await Promise.all(promisesAuths);
    const authorizations: AuthorizationItemObject[] = [];
    allAppAuths.forEach((itemsAuth: AuthorizationItemObject[]) =>
      authorizations.push(...itemsAuth)
    );
    return authorizations;
  }

  async getAuthorizations(
    applicationName: string,
    page: number,
    pageSize: number
  ): Promise<{ items: AuthorizationItemObject[]; total: number }> {
    const app: AsyncReturnType<Tar["getAppByName"]> = await this.getAppByName(
      applicationName
    );
    const [resourceApplicationId] = app;

    const authorizations = await this.getAllAuthorizations(
      resourceApplicationId
    );
    return {
      items: authorizations.slice(pageSize * (page - 1), pageSize * page),
      total: authorizations.length,
    };
  }

  async getAuthorizationsByRequesterApplicationName(
    applicationName: string,
    requesterApplicationName: string,
    page: number,
    pageSize: number
  ): Promise<{ items: AuthorizationItemObject[]; total: number }> {
    let auths: AsyncReturnType<Tar["getAuthorizations"]>;
    const app: AsyncReturnType<Tar["getAppByName"]> = await this.getAppByName(
      applicationName
    );
    const [resourceApplicationId] = app;
    const requesterApplication: AsyncReturnType<Tar["getAppByName"]> =
      await this.getAppByName(requesterApplicationName);

    try {
      auths = await this.getContract().getAuthorizations(
        resourceApplicationId,
        requesterApplication.applicationId,
        page,
        pageSize
      );
    } catch (error) {
      /* empty */
    }
    if (!auths) {
      return { items: [], total: 0 };
    }

    const items = auths.items.map((authorizationId) => ({
      authorizationId,
      authorizedAppName: requesterApplicationName,
    }));
    const total = auths.total.toNumber();
    return { items, total };
  }

  async getAuthorization(
    applicationName: string,
    authorizationId: string
  ): Promise<AuthorizationResponseObject> {
    let authorization: AsyncReturnType<Tar["getAuthorizationById"]>;
    const app: AsyncReturnType<Tar["getAppByName"]> = await this.getAppByName(
      applicationName
    );
    const [resourceApplicationId] = app;

    try {
      authorization = await this.getContract().getAuthorizationById(
        authorizationId
      );
    } catch (e) {
      throw new NotFoundError("Authorization Not Found", {
        detail: `Authorization ${authorizationId} not found`,
      });
    }
    const [
      applicationId,
      authorizedAppId,
      name,
      authorizedAppName,
      iss,
      status,
      permissions,
      notBefore,
      notAfter,
    ] = authorization;

    if (applicationId !== resourceApplicationId) {
      throw new NotFoundError("Authorization Not Found", {
        detail: `Authorization ${authorizationId} not found`,
      });
    }

    let permissionsBinary = Number(permissions).toString(2);
    permissionsBinary =
      "0".repeat(4 - permissionsBinary.length) + permissionsBinary;

    return {
      authorizationId,
      resourceApplicationId: applicationId,
      requesterApplicationId: authorizedAppId,
      resourceApplicationName: name,
      requesterApplicationName: authorizedAppName,
      iss,
      permissions: {
        create: permissionToString(permissionsBinary[0]),
        read: permissionToString(permissionsBinary[1]),
        update: permissionToString(permissionsBinary[2]),
        delete: permissionToString(permissionsBinary[3]),
      },
      status: statusName[status],
      notBefore: notBefore.toNumber(),
      notAfter: notAfter.toNumber(),
    };
  }
}
