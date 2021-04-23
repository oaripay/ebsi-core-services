import * as ebsiDidAuth from "@cef-ebsi/ebsi-siop-auth";
import { INestApplication } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Test, TestingModule } from "@nestjs/testing";
import { FastifyInstance } from "fastify";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";
import * as authenticationModule from "./authentication.module";
import { ApiConfig } from "../../config/configuration";
import { prefix0x, prepareDidAuthRequest } from "./authentication.utils";
import { generateKeys, getPrivateKeyHex } from "../../../tests/auxTests";

describe("add0xPrefix", () => {
  it("should add '0x' at the beginning of the string", () => {
    expect.assertions(1);

    expect(
      prefix0x(
        "0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
      )
    ).toStrictEqual(
      "0x0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
    );
  });

  it("should not add '0x' if the string already starts with'0x'", () => {
    expect.assertions(1);

    expect(
      prefix0x(
        "0x0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
      )
    ).toStrictEqual(
      "0x0a9a229c18f1777949243bbe875b754b77fb9cb3612c8b5c37876888f54f9731"
    );
  });
});
describe("prepareDidAuthRequest", () => {
  let configService: ConfigService<ApiConfig>;
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [authenticationModule.default],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    configService = moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
  });
  it("should call the EBSI createAuthenticationRequest with the proper data", async () => {
    expect.assertions(1);
    const { privateKey } = await generateKeys("ES256K");
    const privateKeyHex = await getPrivateKeyHex(privateKey);
    const wallet = new ethers.Wallet(`0x${privateKeyHex}`);

    const appId = configService.get<string>("applicationId");
    const appDid = `did:ebsi:${wallet.address.toLowerCase()}`;

    const domain = `https://api.test.intebsi.xyz/onboarding/v1/authentication-responses`;
    const kid = `${"https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps"}/${appId}`;

    const ebsiMocked = jest.spyOn(
      ebsiDidAuth.EbsiDidAuth,
      "createAuthenticationRequest"
    );

    await prepareDidAuthRequest(domain, `0x${privateKeyHex}`, kid, appDid);

    const didAuthRequestCall = {
      redirectUri: domain,
      hexPrivateKey: `0x${privateKeyHex}`,
      issuer: `did:ebsi:${wallet.address.toLowerCase()}`,
      kid,
    };
    expect(ebsiMocked).toHaveBeenCalledWith(didAuthRequestCall);
  });
});
