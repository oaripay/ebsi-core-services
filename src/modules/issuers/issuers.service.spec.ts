import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ethers } from "ethers";
import { FastifyInstance } from "fastify";
import IssuersService from "./issuers.service";
import AppModule from "../../app.module";
import mockTirContract from "../../../tests/mockTirContract";

jest.spyOn(ethers, "Contract").mockImplementation(mockTirContract);

describe("issuersService", () => {
  let app: INestApplication;
  let issuersService: IssuersService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    issuersService = moduleFixture.get<IssuersService>(IssuersService);
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should getIssuers", async () => {
    expect.assertions(2);

    const issuers = await issuersService.getIssuers(0, 10);
    expect(issuers).toStrictEqual({
      items: expect.arrayContaining([]) as string[],
      total: ethers.BigNumber.from(20),
      pageSize: ethers.BigNumber.from(10),
      prev: ethers.BigNumber.from(0),
      next: ethers.BigNumber.from(1),
    });
    expect(issuers.items).toHaveLength(10);
  });

  it("should getIssuers different pagination", async () => {
    expect.assertions(6);
    const issuers1 = await issuersService.getIssuers(0, 3);
    expect(issuers1).toStrictEqual({
      items: expect.arrayContaining([]) as string[],
      total: ethers.BigNumber.from(20),
      pageSize: ethers.BigNumber.from(3),
      prev: ethers.BigNumber.from(0),
      next: ethers.BigNumber.from(1),
    });
    expect(issuers1.items).toHaveLength(3);

    const issuers2 = await issuersService.getIssuers(1, 3);
    expect(issuers2).toStrictEqual({
      items: expect.arrayContaining([]) as string[],
      total: ethers.BigNumber.from(20),
      pageSize: ethers.BigNumber.from(3),
      prev: ethers.BigNumber.from(0),
      next: ethers.BigNumber.from(2),
    });
    expect(issuers2.items).toHaveLength(3);

    // big page
    const issuers3 = await issuersService.getIssuers(800, 3);
    expect(issuers3).toStrictEqual({
      items: expect.arrayContaining([]) as string[],
      total: ethers.BigNumber.from(20),
      pageSize: ethers.BigNumber.from(3),
      prev: ethers.BigNumber.from(5),
      next: ethers.BigNumber.from(6),
    });
    expect(issuers3.items).toHaveLength(2);
  });

  it("gets the domain", () => {
    expect.assertions(1);
    expect(issuersService.getDomain()).toStrictEqual(expect.any(String));
  });

  it("should throw error bad pagination for getIssuers", async () => {
    expect.assertions(2);
    await expect(issuersService.getIssuers(0, 100)).rejects.toThrow(
      "Bad Paging Request"
    );
    await expect(issuersService.getIssuers(0, 0)).rejects.toThrow(
      "Bad Paging Request"
    );
  });

  it(`gets a specific issuer`, async () => {
    expect.assertions(1);
    const issuer = await issuersService.getIssuer("did:ebsi:0x03");

    expect(issuer).toStrictEqual({
      did: "did:ebsi:0x03",
      attributes: [{ name: "dany" }],
    });
  });

  it(`throws error for issuer not found`, async () => {
    expect.assertions(1);
    await expect(issuersService.getIssuer("unknownDID")).rejects.toThrow(
      "Issuer Not Found"
    );
  });
});
