import { URLSearchParams } from "node:url";
import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosResponse } from "axios";
import * as xml2js from "xml2js";
import * as XMLprocessors from "xml2js/lib/processors";
import { ConfigService } from "@nestjs/config";
import { createJWT, ES256KSigner } from "did-jwt";
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

  private apiDid: string;

  private apiPrivateKey: string;

  private recaptchaService: string;

  private recaptchaRegisteredHostname: string;

  private euloginService: string;

  private euloginServiceParam: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    [this.apiDid] = this.configService
      .get<string>("apiVerificationMethodKid")
      .split("#");
    this.recaptchaRegisteredHostname = this.configService.get<string>(
      "recaptchaRegisteredHostname"
    );
    this.euloginService = this.configService.get<string>("euloginService");

    this.euloginServiceParam = this.configService.get<string>(
      "euloginServiceParam"
    );

    this.apiPrivateKey = this.configService.get<string>("apiPrivateKey");
    this.recaptchaService = this.configService.get<string>("recaptchaService");
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
      userInfo = await axios.get(`${this.euloginService}?${parameters}`);
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
        `${this.recaptchaService}/siteverify?${parameters}`
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
      const token = await createJWT(
        {
          onboarding: userAuthentication.onboarding,
          validatedInfo,
        },
        {
          alg: "ES256K",
          issuer: this.apiDid,
          signer: ES256KSigner(this.apiPrivateKey),
          canonicalize: true,
          expiresIn: 15 * 60, // 15 minutes
        }
      );
      return { Bearer: token };
    } catch (error) {
      if (error instanceof Error) {
        throw new InvalidSession(error.message);
      }

      throw new InvalidSession(error as string);
    }
  }
}
