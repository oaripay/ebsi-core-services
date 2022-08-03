import { URLSearchParams } from "node:url";
import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosResponse } from "axios";
import { ec as EC } from "elliptic";
import { bytes } from "multiformats";
import { base64url } from "multiformats/bases/base64";
import * as xml2js from "xml2js";
import * as XMLprocessors from "xml2js/lib/processors";
import { ConfigService } from "@nestjs/config";
import { importJWK, JWK, SignJWT } from "jose";
import { ApiConfig } from "../../config/configuration";
import { InvalidSession, InvalidUserAuthentication } from "../../errors";
import { UserAuthentication } from "../../shared/dto";
import { OnboardingErrors } from "../../errors/errorCodes";
import {
  CaptchaAuthenticationInfo,
  CaptchaAuthenticationValidatedInfo,
  EULoginAuthenticationInfo,
  EULoginAuthenticationValidatedInfo,
  SessionToken,
  UserEU,
} from "../../shared/interfaces";

const TICKET_TYPES = "SERVICE,DESKTOP,PROXY";
const ASSURANCE_LEVEL = "LOW";

const parseXML = xml2js.parseStringPromise;

type EULoginResponse = {
  serviceresponse: {
    authenticationsuccess?: UserEU;
    authenticationfailure?: {
      _?: string;
      $?: {
        code?: string;
      };
    };
  };
};

@Injectable()
export default class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  private apiKid: string;

  private apiDid: string;

  private apiPrivateKeyHex: string;

  private apiPrivateKeyJwk: JWK;

  private recaptchaService: string;

  private recaptchaRegisteredHostname: string;

  private euloginService: string;

  private euloginServiceParam: string;

  private timeout: number;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.apiKid = this.configService.get<string>("apiVerificationMethodKid");
    [this.apiDid] = this.apiKid.split("#");
    this.recaptchaRegisteredHostname = this.configService.get<string>(
      "recaptchaRegisteredHostname"
    );
    this.euloginService = this.configService.get<string>("euloginService");

    this.euloginServiceParam = this.configService.get<string>(
      "euloginServiceParam"
    );

    this.apiPrivateKeyHex = this.configService.get<string>("apiPrivateKey");
    this.recaptchaService = this.configService.get<string>("recaptchaService");

    const hexPrivateKey = this.apiPrivateKeyHex.replace(/^0x/, "");
    const ec = new EC("secp256k1");
    const apiPubPoint = ec.keyFromPrivate(hexPrivateKey, "hex").getPublic();
    const apiPublicKeyJwk = {
      kty: "EC",
      crv: "secp256k1",
      x: base64url.baseEncode(apiPubPoint.getX().toBuffer("be", 32)),
      y: base64url.baseEncode(apiPubPoint.getY().toBuffer("be", 32)),
    };
    this.apiPrivateKeyJwk = {
      ...apiPublicKeyJwk,
      d: base64url.baseEncode(bytes.fromHex(hexPrivateKey)),
    };
    this.timeout = configService.get<number>("requestTimeout");
  }

  async validateOnboarding(
    userAuthentication: UserAuthentication
  ): Promise<
    CaptchaAuthenticationValidatedInfo | EULoginAuthenticationValidatedInfo
  > {
    if (userAuthentication.onboarding === "eu-login") {
      const ticket = (userAuthentication.info as EULoginAuthenticationInfo)[
        "eul-ticket"
      ];
      return this.validateTicket(ticket);
    }

    if (userAuthentication.onboarding === "recaptcha") {
      return this.validateRecaptcha(
        (userAuthentication.info as CaptchaAuthenticationInfo).token
      );
    }

    throw new InvalidUserAuthentication(
      OnboardingErrors.UNSUPPORTED_ONBOARDING
    );
  }

  async parseEULoginUser(xml: string): Promise<UserEU> {
    let result: EULoginResponse;

    try {
      const options = {
        trim: true,
        normalize: true,
        explicitArray: false,
        tagNameProcessors: [XMLprocessors.normalize, XMLprocessors.stripPrefix],
      };

      result = (await parseXML(xml, options)) as EULoginResponse;
    } catch {
      throw new InvalidUserAuthentication(
        OnboardingErrors.ERROR_EUTICKET_PARSE
      );
    }

    if (
      !result?.serviceresponse?.authenticationsuccess ||
      typeof result.serviceresponse.authenticationsuccess !== "object"
    ) {
      this.logger.error(result.serviceresponse);
      throw new InvalidUserAuthentication(
        OnboardingErrors.ERROR_EUTICKET_VALIDATION
      );
    }

    return result.serviceresponse.authenticationsuccess;
  }

  async validateTicket(
    ticket: string
  ): Promise<EULoginAuthenticationValidatedInfo> {
    const parameters = new URLSearchParams({
      service: this.euloginServiceParam,
      userDetails: "true",
      assuranceLevel: ASSURANCE_LEVEL,
      ticketTypes: TICKET_TYPES,
      ticket,
    }).toString();

    let userInfo: AxiosResponse;

    try {
      userInfo = await axios.get(`${this.euloginService}?${parameters}`, {
        timeout: this.timeout,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new InvalidUserAuthentication(error.message);
      }

      throw new InvalidUserAuthentication(error as string);
    }

    if (!userInfo || !userInfo.data) {
      throw new InvalidUserAuthentication(
        OnboardingErrors.EUTICKET_NOT_RESOLVED
      );
    }

    const userEU = await this.parseEULoginUser(userInfo.data as string);

    if (!userEU) {
      throw new InvalidUserAuthentication(
        OnboardingErrors.ERROR_EUTICKET_VALIDATION
      );
    }

    return { validatedUser: userEU };
  }

  async validateRecaptcha(
    token: string
  ): Promise<CaptchaAuthenticationValidatedInfo> {
    const parameters = new URLSearchParams({
      secret: this.configService.get<string>("recaptchaApiKey"),
      response: token,
    }).toString();

    try {
      const response = await axios.get<CaptchaAuthenticationValidatedInfo>(
        `${this.recaptchaService}/siteverify?${parameters}`,
        { timeout: this.timeout }
      );

      // score ranges from 0 to 1 where 0 is a bot an 1 is a human
      // see https://developers.google.com/recaptcha/docs/v3 for more details
      if (
        response.data.success &&
        response.data.hostname.includes(this.recaptchaRegisteredHostname) &&
        response.data.score > 0.25
      ) {
        return response.data;
      }

      this.logger.error(response.data);
    } catch (error) {
      this.logger.error(error);
      throw new InvalidUserAuthentication(
        OnboardingErrors.ERROR_RECAPTCHA_VALIDATION
      );
    }

    return undefined;
  }

  async provideSessionToken(
    userAuthentication: UserAuthentication,
    validatedInfo:
      | EULoginAuthenticationValidatedInfo
      | CaptchaAuthenticationValidatedInfo
  ): Promise<SessionToken> {
    try {
      const apiPrivateKey = await importJWK(this.apiPrivateKeyJwk, "ES256K");
      const token = await new SignJWT({
        onboarding: userAuthentication.onboarding,
        validatedInfo,
      })
        .setProtectedHeader({
          alg: "ES256K",
          typ: "JWT",
          kid: this.apiKid,
        })
        .setIssuer(this.apiDid)
        .setIssuedAt()
        .setExpirationTime("15m") // 15 minutes
        .sign(apiPrivateKey);

      return { Bearer: token };
    } catch (error) {
      if (error instanceof Error) {
        throw new InvalidSession(error.message);
      }

      throw new InvalidSession(error as string);
    }
  }
}
