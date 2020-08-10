import { Test } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import utils from "web3-utils";
import { BigNumber } from "ethers";
import { EthersService } from "../../src/services/ethers.service";
import configuration from "../../src/config/configuration";

describe("ethers.service (integration)", () => {
  let ethersService: EthersService;

  // eslint-disable-next-line jest/no-hooks
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: [".env.test", ".env"],
          load: [configuration],
        }),
      ],
      providers: [EthersService],
    }).compile();

    ethersService = module.get<EthersService>(EthersService);
  });

  // eslint-disable-next-line jest/no-hooks
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should be defined", () => {
    expect.assertions(1);
    expect(ethersService).toBeDefined();
  });

  it("getSigner should return the signer", async () => {
    expect.assertions(1);
    const signer = await ethersService.getSigner();
    expect(signer.startsWith("0x")).toBe(true);
  });

  it("getApplicationPublicKey should return the public key", async () => {
    expect.assertions(1);
    const publicKey = await ethersService.getApplicationPublicKey(
      "ebsi-wallet"
    );

    const buff = Buffer.from(publicKey, "base64");
    const text = buff.toString("ascii");

    expect(text.startsWith("-----BEGIN PUBLIC KEY-----")).toBe(true);
  });

  it("getApplicationKeys should return a list of keys", async () => {
    expect.assertions(2);
    const appKeys = await ethersService.getApplicationKeys();
    expect(Array.isArray(appKeys)).toBe(true);
    expect(appKeys.every((key) => key instanceof BigNumber)).toBe(true);
  });

  it("getAuthorizedApps should return an array of apps with their authorizations", async () => {
    expect.assertions(1);
    const authApps = await ethersService.getAuthorizedApps("ebsi-wallet");
    // authApps should be an array of [app names]
    expect(Array.isArray(authApps)).toBe(true);
  });

  it("revertMessage should throw an error for an invalid hash", async () => {
    expect.assertions(1);
    await expect(ethersService.revertMessage("test")).rejects.toThrow(
      "Invalid params"
    );
  });

  it("revertMessage should return null for an unknown hash", async () => {
    expect.assertions(3);

    const loggerErrorSpy = jest
      .spyOn(Logger, "debug")
      .mockImplementation(() => {});

    const result = await ethersService.revertMessage(utils.randomHex(32));
    expect(result).toBeNull();
    expect(loggerErrorSpy).toHaveBeenCalledTimes(2);
    expect(loggerErrorSpy).toHaveBeenNthCalledWith(
      2,
      "tx not found",
      "EthersService",
      false
    );
  });
});
