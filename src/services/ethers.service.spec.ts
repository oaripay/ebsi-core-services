import { Test } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import utils from "web3-utils";
import configuration from "../config/configuration";
import { EthersService } from "./ethers.service";

jest.mock("web3", () =>
  jest.fn().mockImplementation(() => ({
    eth: {
      getTransactionReceipt(txHash) {
        if (txHash === "test")
          return Promise.reject(new Error("Invalid params"));

        return null;
      },
    },
  }))
);

jest.mock("ethers", () => ({
  ethers: {
    providers: {
      JsonRpcProvider: jest.fn(),
    },
    Contract: jest.fn().mockImplementation(() => ({
      connect() {
        return {
          owner() {
            return "0xtest";
          },
          getApplicationPublicKey() {
            return Buffer.from("-----BEGIN PUBLIC KEY----- ...");
          },
          getApplicationKeys() {
            return ["0xtest1", "0xtest2"];
          },
          getApplicationByKey() {
            throw new Error(
              'invalid input argument (arg="appKey", reason="invalid bytes32 value", value="key1", version=4.0.47)'
            );
          },
          getAuthorizedApps() {
            return [
              ["ebsi-wallet", "ebsi-storage"],
              [true, false],
            ];
          },
        };
      },
    })),
    Wallet: jest.fn().mockImplementation(() => ({})),
  },
}));

describe("ethers.service", () => {
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
    expect(appKeys.every((key) => key.startsWith("0x"))).toBe(true);
  });

  it("getApplicationByKey should throw if the key is invalid", async () => {
    expect.assertions(1);
    await expect(ethersService.getApplicationByKey("key1")).rejects.toThrow(
      'invalid input argument (arg="appKey", reason="invalid bytes32 value", value="key1", version=4.0.47)'
    );
  });

  it("getAuthorizedApps should return an array of apps with their authorizations", async () => {
    expect.assertions(3);
    const authApps = await ethersService.getAuthorizedApps("ebsi-wallet");

    // authApps should be an array of arrays [[app names], [booleans]]
    expect(
      Array.isArray(authApps) &&
        Array.isArray(authApps[0]) &&
        Array.isArray(authApps[1])
    ).toBe(true);

    // Apps should start with "esbi"
    expect(authApps[0].every((appName) => appName.startsWith("ebsi-"))).toBe(
      true
    );

    // Second array should contain only booleans
    expect(authApps[1].every((auth) => auth === true || auth === false)).toBe(
      true
    );
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
