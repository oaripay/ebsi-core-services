import fs from "fs";
import path from "path";
import { generateKeyPairSync } from "crypto";
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import NodeRSA from "node-rsa";
import { AppService } from "./app.service";
import { EthersService } from "./ethers.service";
import configuration from "../config/configuration";

describe("app.service", () => {
  let appService: AppService;
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
      providers: [AppService, EthersService],
    }).compile();

    appService = module.get<AppService>(AppService);
    ethersService = module.get<EthersService>(EthersService);
  });

  // eslint-disable-next-line jest/no-hooks
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should be defined", () => {
    expect.assertions(1);
    expect(appService).toBeDefined();
  });

  it("should keep the key in memory after loading it once", () => {
    expect.assertions(2);

    // Create fake PEM
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    const fsSpy = jest
      .spyOn(fs, "readFileSync")
      .mockImplementationOnce(() => Buffer.from(privateKey));

    const key1 = appService.loadKey();

    expect(fsSpy).toHaveBeenCalledWith(
      path.resolve(__dirname, "../../key/private.pem")
    );

    const key2 = appService.loadKey();

    expect(key1).toStrictEqual(key2);
  });

  it("should generate a login challenge", () => {
    expect.assertions(2);

    const key = new NodeRSA({ b: 512 }, "pkcs8");

    const loadKeySpy = jest
      .spyOn(appService, "loadKey")
      .mockImplementation(() => key);

    const challenge = appService.generateLoginChallenge("test");

    expect(loadKeySpy).toHaveBeenCalledTimes(1);
    expect(key.decrypt(challenge).toString("ascii")).toStrictEqual(
      expect.stringContaining("test.")
    );
  });

  it("should check the login", async () => {
    expect.assertions(4);

    const key = new NodeRSA({ b: 512 }, "pkcs8");

    const loadKeySpy = jest
      .spyOn(appService, "loadKey")
      .mockImplementation(() => key);

    const recoverAddressSpy = jest
      .spyOn(EthersService, "recoverAddress")
      .mockImplementation(() => "fakeAddress");

    const getSignerSpy = jest
      .spyOn(ethersService, "getSigner")
      .mockImplementation(async () => "fakeAddress");

    const cryptedMessage = appService.generateLoginChallenge("test");
    const app = await appService.checkLogin(cryptedMessage, "");

    expect(loadKeySpy).toHaveBeenCalledTimes(2);
    expect(recoverAddressSpy).toHaveBeenCalledTimes(1);
    expect(getSignerSpy).toHaveBeenCalledTimes(1);
    expect(app).toStrictEqual("test");
  });

  it("should deny the login if the address if different from the signer", async () => {
    expect.assertions(4);

    const key = new NodeRSA({ b: 512 }, "pkcs8");

    const loadKeySpy = jest
      .spyOn(appService, "loadKey")
      .mockImplementation(() => key);

    const recoverAddressSpy = jest
      .spyOn(EthersService, "recoverAddress")
      .mockImplementation(() => "fakeAddress1");

    const getSignerSpy = jest
      .spyOn(ethersService, "getSigner")
      .mockImplementation(async () => "fakeAddress2");

    const cryptedMessage = appService.generateLoginChallenge("test");
    const check = async () => appService.checkLogin(cryptedMessage, "");

    await expect(check).rejects.toThrow("your ether wallet is not authorized");
    expect(loadKeySpy).toHaveBeenCalledTimes(1);
    expect(recoverAddressSpy).toHaveBeenCalledTimes(1);
    expect(getSignerSpy).toHaveBeenCalledTimes(1);
  });

  it("should deny the login if the challenge is expired", async () => {
    expect.assertions(4);

    const key = new NodeRSA({ b: 512 }, "pkcs8");

    const loadKeySpy = jest
      .spyOn(appService, "loadKey")
      .mockImplementation(() => key);

    const recoverAddressSpy = jest
      .spyOn(EthersService, "recoverAddress")
      .mockImplementation(() => "fakeAddress");

    const getSignerSpy = jest
      .spyOn(ethersService, "getSigner")
      .mockImplementation(async () => "fakeAddress");

    jest.spyOn(Date, "now").mockImplementationOnce(() => 1580748744344);

    const cryptedMessage = appService.generateLoginChallenge("test");

    const check = async () => appService.checkLogin(cryptedMessage, "");

    await expect(check).rejects.toThrow("login expired");
    expect(loadKeySpy).toHaveBeenCalledTimes(2);
    expect(recoverAddressSpy).toHaveBeenCalledTimes(1);
    expect(getSignerSpy).toHaveBeenCalledTimes(1);
  });
});
