import moment from "moment";
import EBSI_JWT from "@cef-ebsi/app-jwt";
import { ICASFile } from "../../daos/casFile";
import { ICASStorageOut } from "../../dtos/dataStorage";
import { IEbsiApiAuthConnection, ILoginReturn } from "../../dtos/ebsiApi";
import * as config from "../../config";
import * as api from "../../utils/api";
import { InternalError, ApiErrorMessages } from "../../errors";
import { isTokenExpired } from "../../utils/util";
import {
  AccessTokenResponseBody,
  TokenType,
  EbsiAccessTokenScope,
} from "./secureEnclave/jwt";
import ComponentSecureEnclave from "./secureEnclave/componentSecureEnclave";

/**
 * Class to a SingleTon Class AuthManager
 */
export default class AuthManager {
  private static instance: AuthManager;

  private ebsiApiAuthZTokenMap!: Map<string, IEbsiApiAuthConnection>;

  /**
   * Create an instance of an AuthManager.
   * @param EBSIAPICred Authentication Credentials (user,pass)? to access protected EBSI API calls
   */
  private constructor(
    private secureEnclave: ComponentSecureEnclave = ComponentSecureEnclave.Instance
  ) {
    this.ebsiApiAuthZTokenMap = new Map<string, IEbsiApiAuthConnection>();

    config.EBSI_API_MAP.forEach((url, name) => {
      this.ebsiApiAuthZTokenMap.set(name, <IEbsiApiAuthConnection>{
        url,
        token: "",
      });
    });
  }

  /**
   * Returns an instance of the created AuthManager
   * Used when it is not known the constructor parameters, which
   * should be known only in the controller class
   */
  static get Instance() {
    if (!this.instance) this.instance = new this();
    return this.instance;
  }

  /**
   * Executes a POST call
   * @param data data to sent insie the POST call
   * @param url complete url to a POST REST API call
   */
  async doPostCall(data: any, url: string, targetApp: string): Promise<any> {
    const token = await this.getAuthZToken(targetApp);
    return api.doPostCallWithToken(token, data, url);
  }

  /**
   * Executes a PUTH call
   * @param data data to sent insie the POST call
   * @param url complete url to a POST REST API call
   */
  async doPutCall(data: any, url: string, targetApp: string): Promise<any> {
    const token = await this.getAuthZToken(targetApp);
    return api.doPutCallWithToken(token, data, url);
  }

  /**
   * Executes a PATCH call
   * @param data data to sent insie the POST call
   * @param url complete url to a POST REST API call
   */
  async doPatchCall(data: any, url: string, targetApp: string): Promise<any> {
    const token = await this.getAuthZToken(targetApp);
    return api.doPatchCallWithToken(token, data, url);
  }

  /**
   * Executes a DELETE call
   * @param data data to sent insie the POST call
   * @param url complete url to a POST REST API call
   */
  async doDeleteCall(url: string, targetApp: string): Promise<void> {
    const token = await this.getAuthZToken(targetApp);
    await api.doDeleteCallWithToken(token, url);
  }

  /**
   * Executes a POST multipart/form-data call
   * @param iFile struct with the file information and the database to store
   * @param url complete url to a POST REST API call
   */
  async doPostFormCall(
    iFile: ICASFile,
    url: string,
    targetApp: string
  ): Promise<ICASStorageOut> {
    const token = await this.getAuthZToken(targetApp);
    return api.doPostFormCallWithToken(token, iFile, url);
  }

  /**
   * Executes a GET call
   * @param url complete url to a GET REST API call
   */
  async doGetCall(url: string, targetApp: string): Promise<any> {
    const token = await this.getAuthZToken(targetApp);
    return api.doGetCallWithToken(token, url);
  }

  /**
   * Returns the Auth Token for any protected call to the EBSI API
   */
  async getAuthZToken(targetApp: string): Promise<string> {
    const appInfo = this.ebsiApiAuthZTokenMap.get(targetApp);
    if (!appInfo) throw new InternalError(ApiErrorMessages.NO_TARGET_APP_INFO);

    if (appInfo.token === "" || isTokenExpired(appInfo.token)) {
      const authZToken = await this.doLogin(targetApp);

      appInfo.token = authZToken.token;

      this.ebsiApiAuthZTokenMap.set(targetApp, appInfo);
    }

    return appInfo.token;
  }

  async createAuthNToken(targetApp: string): Promise<string> {
    const payload = {
      iss: config.API_NAME,
      aud: targetApp,
      iat: moment().unix(),
      exp: moment().add(15, "minutes").unix(),
    };
    const buffer = Buffer.from(JSON.stringify(payload));
    const se = this.secureEnclave;

    const jwt = await se.signJwt(se.enclaveDid, buffer);
    return jwt;
  }

  async createAuthorizationToken(
    payload: any,
    subject?: string
  ): Promise<string> {
    const ebsiPayload = {
      ...payload,
      ...{
        sub: subject, // Should be the id of the app that is requesting the token
        iat: moment().unix(),
        exp: moment().add(15, "minutes").unix(),
        aud: config.API_NAME,
      },
    };

    const buffer = Buffer.from(JSON.stringify(ebsiPayload));

    const se = this.secureEnclave;

    const jwt = await se.signJwt(se.enclaveDid, buffer);
    return jwt;
  }

  /**
   * call EBSI API /sessions
   */
  private async doLogin(targetApp: string): Promise<ILoginReturn> {
    // send to remote /sessions endpoint
    const appInfo = this.ebsiApiAuthZTokenMap.get(targetApp);
    if (!appInfo) throw new InternalError(ApiErrorMessages.NO_TARGET_APP_INFO);

    const agent = new EBSI_JWT.Agent(
      EbsiAccessTokenScope.COMPONENT,
      config.API_PRIVATE_KEY,
      {
        issuer: config.API_NAME,
      }
    );
    const payload = await agent.createRequestPayload(targetApp);

    const resp: AccessTokenResponseBody = await api.doPostCallWithoutToken(
      payload,
      appInfo.url + config.EBSI_SERVICE.CALL.EBSI_LOGIN
    );

    if (
      !resp ||
      !resp.accessToken ||
      !resp.tokenType ||
      resp.tokenType !== TokenType.bearer
    )
      throw new InternalError(ApiErrorMessages.NO_AUTHZ_TOKEN);

    return { token: resp.accessToken };
  }
}
