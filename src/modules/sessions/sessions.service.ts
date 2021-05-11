import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosResponse } from "axios";
import * as xml2js from "xml2js";
import * as XMLprocessors from "xml2js/lib/processors";
import querystring from "querystring";
import { ConfigService } from "@nestjs/config";
import { createJWT, ES256KSigner } from "@cef-ebsi/did-jwt";
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

@Injectable()
export default class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  private applicationDid: string;

  private apiPrivateKey: string;

  private recaptchaService: string;

  private recaptchaRegisteredHostname: string;

  private euloginService: string;

  private euloginServiceParam: string;

  constructor(private configService: ConfigService<ApiConfig>) {
    this.applicationDid = this.configService.get<string>("applicationDid");
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
    if (userAuthentication.onboarding === "recaptcha")
      return this.validateRecaptcha(
        (userAuthentication.info as CaptchaAuthenticationInfo).token
      );
    throw new InvalidUserAuthentication(
      OnboardingErrors.UNSUPPORTED_ONBOARDING
    );
  }

  async parseEULoginUser(xml: string): Promise<UserEU> {
    try {
      const options = {
        trim: true,
        normalize: true,
        explicitArray: false,
        tagNameProcessors: [XMLprocessors.normalize, XMLprocessors.stripPrefix],
      };
      const result = (await parseXML(xml, options)) as {
        serviceresponse: { authenticationsuccess: UserEU };
      };
      if (
        !result?.serviceresponse?.authenticationsuccess ||
        typeof result.serviceresponse.authenticationsuccess !== "object"
      )
        throw new InvalidUserAuthentication(
          OnboardingErrors.ERROR_EUTICKET_PARSE
        );
      return result.serviceresponse.authenticationsuccess;
    } catch {
      throw new InvalidUserAuthentication(
        OnboardingErrors.ERROR_EUTICKET_PARSE
      );
    }
  }

  async validateTicket(
    ticket: string
  ): Promise<EULoginAuthenticationValidatedInfo> {
    const parameters = querystring.encode({
      service: `${encodeURI(this.euloginServiceParam)}`,
      userDetails: true,
      assuranceLevel: ASSURANCE_LEVEL,
      ticketTypes: TICKET_TYPES,
      ticket,
    });
    let userInfo: AxiosResponse;
    try {
      userInfo = await axios.get(`${this.euloginService}?${parameters}`);
    } catch (error) {
      throw new InvalidUserAuthentication(error);
    }
    if (!userInfo || !userInfo.data)
      throw new InvalidUserAuthentication(
        OnboardingErrors.EUTICKET_NOT_RESOLVED
      );
    const userEU = await this.parseEULoginUser(userInfo.data);
    if (!userEU)
      throw new InvalidUserAuthentication(
        OnboardingErrors.ERROR_EUTICKET_VALIDATION
      );
    return { validatedUser: userEU };
  }

  async validateRecaptcha(
    token: string
  ): Promise<CaptchaAuthenticationValidatedInfo> {
    const parameters = querystring.encode({
      secret: this.configService.get<string>("recaptchaApiKey"),
      response: token,
    });
    try {
      const response = await axios.get<CaptchaAuthenticationValidatedInfo>(
        `${this.recaptchaService}/siteverify?${parameters}`
      );
      // score ranges from 0 to 1 where 0 is a bot an 1 is a human
      // see https://developers.google.com/recaptcha/docs/v3 for more details
      if (
        response.data.success &&
        response.data.hostname === this.recaptchaRegisteredHostname &&
        response.data.score > 0.5
      )
        return response.data;
    } catch (error) {
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
          issuer: this.applicationDid,
          signer: ES256KSigner(this.apiPrivateKey),
        }
      );
      return { Bearer: token };
    } catch (error) {
      throw new InvalidSession(error);
    }
  }
}
