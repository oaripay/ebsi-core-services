import moment from "moment";
import { JWT } from "jose";
import { ICASFile } from "../../daos/casFile";
import { ICASStorageOut } from "../../dtos/dataStorage";
import { IEbsiApiAuthConnection, ILoginReturn } from "../../dtos/ebsiApi";
import * as config from "../../config";
import * as api from "../../utils/api";
import { InternalError, API_ERROR_MESSAGES } from "../../errors";
import { isTokenExpired } from "../../utils/util";
import {
  IUserAuthZToken,
  AccessTokenRequestBody,
  GRANT_TYPE,
  AccessTokenResponseBody,
  TOKEN_TYPE,
} from "./secureEnclave/jwt";
import ComponentSecureEnclave from "./secureEnclave/componentSecureEnclave";
import SecureEnclave from "./secureEnclave";

/**
 * Class to a SingleTon Class AuthManager
 */
export default class AuthManager {
  private static instance: AuthManager;

  private ebsiApiAuthZTokenMap!: Map<string, IEbsiApiAuthConnection>;

  private receivedAuthZTokenMap!: Map<string, string>;

  /**
   * Create an instance of an AuthManager.
   * @param EBSIAPICred Authentication Credentials (user,pass)? to access protected EBSI API calls
   */
  private constructor(
    private secureEnclave: SecureEnclave = ComponentSecureEnclave.Instance
  ) {
    if (!config.EBSI_API_MAP)
      throw new InternalError(API_ERROR_MESSAGES.NO_CONFIG_TRUSTED_APP_NAMES);

    this.ebsiApiAuthZTokenMap = new Map<string, IEbsiApiAuthConnection>();
    this.receivedAuthZTokenMap = new Map<string, string>();

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
    if (!appInfo)
      throw new InternalError(API_ERROR_MESSAGES.NO_TARGET_APP_INFO);

    if (appInfo.token === "" || isTokenExpired(appInfo.token)) {
      const authZToken = await this.doLogin(targetApp);

      appInfo.token = authZToken.token;

      this.ebsiApiAuthZTokenMap.set(targetApp, appInfo);
    }

    return appInfo.token;
  }

  getReceivedAuthZUserToken(did: string): string {
    const token = this.receivedAuthZTokenMap.get(did);
    if (!token) throw new InternalError(API_ERROR_MESSAGES.NO_AUTHZ_TOKEN);
    return token;
  }

  /**
   * stores the authZ token that belongs to a specific did
   * decode token and extract the did from it
   * it can be either a IUserAuthZToken or a IEnterpriseAuthZToken
   * both cases contain a did
   * @param token
   */
  saveReceivedAuthZUserToken(token: string): void {
    const authZToken = <IUserAuthZToken>JWT.decode(token);
    if (!authZToken || !authZToken.did)
      throw new InternalError(API_ERROR_MESSAGES.NO_AUTHZ_TOKEN);
    this.receivedAuthZTokenMap.set(authZToken.did, token);
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

    try {
      const jwt = await se.signJwt(se.enclaveDid, buffer);
      return jwt;
    } catch (error) {
      throw new InternalError(error.message);
    }
  }

  /**
   * call EBSI API /sessions
   */
  private async doLogin(targetApp: string): Promise<ILoginReturn> {
    // generate AuthN token
    const token = await this.createAuthNToken(targetApp);
    // send to remote /sessions endpoint
    const appInfo = this.ebsiApiAuthZTokenMap.get(targetApp);

    if (!appInfo)
      throw new InternalError(API_ERROR_MESSAGES.NO_TARGET_APP_INFO);

    const payload: AccessTokenRequestBody = {
      grantType: GRANT_TYPE.jwtBearer,
      assertion: token,
    };
    const resp: AccessTokenResponseBody = await api.doPostCallWithoutToken(
      payload,
      appInfo.url + config.EBSI_SERVICE.CALL.EBSI_LOGIN
    );

    if (!resp || !resp.accessToken || resp.tokenType !== TOKEN_TYPE.bearer)
      throw new InternalError(API_ERROR_MESSAGES.NO_AUTHZ_TOKEN);

    return { token: resp.accessToken };
  }
}
