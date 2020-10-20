import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { ethers } from "ethers";
import { HashesService } from "./hashes.service";
import AppModule from "../../app.module";
import mockNotaryContract from "../../../tests/mockNotaryContract";
import mockEthersProvider from "../../../tests/mockEthersProvider";

jest.spyOn(ethers, "Contract").mockImplementation(mockNotaryContract);
jest
  .spyOn(ethers.providers, "JsonRpcProvider")
  .mockImplementation(mockEthersProvider);

describe("HashesService", () => {
  let hashesService: HashesService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // Turn off logger
    Logger.overrideLogger(false);
    hashesService = moduleFixture.get<HashesService>(HashesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("get a record", async () => {
    expect.assertions(1);
    const expectedRecord = {
      hash: "9d835ec5cc060cbef177a45ec9219e2831c11048aaf130e5f6690619f0f5200a",
      txHash:
        "0xb0fec9e4ba9958f3f42b78ec7076d6aa6991c98b31f7efcce5e1d9faa07b3e11",
      blockNumber: 646595,
      timestamp: new Date(1586171386 * 1000).toISOString(),
      registeredBy: "0x0ef9c28263fd26be9d597925be02085bb1236b59",
    };
    const result = await hashesService.getRecord(
      "0xde020FB144Bc3239C1446EB9dE73706A47D5929b"
    );
    expect(result).toStrictEqual(expectedRecord);
  });

  it("get a record list", async () => {
    expect.assertions(1);
    const expectedRecord = {
      items: [
        {
          blockNumber: 8571109,
          hash:
            "5265d8a717cf7533fbe7ccbc45315558884aac57cb5321194e2aafa4c732d5bf",
          registeredBy: "0xf9d96b9ff6bc59a6fe8b56e9c50ac311e931c375",
          timestamp: new Date(1586171386 * 1000).toISOString(),
          txHash:
            "0x628f8a9aad9d94c38e29787c36837fe8d513c335ec2d06482a3e26dc1a78785a",
        },
        {
          blockNumber: 8571109,
          hash:
            "5265d8a717cf7533fbe7ccbc45315558884aac57cb5321194e2aafa4c732d5bf",
          registeredBy: "0xf9d96b9ff6bc59a6fe8b56e9c50ac311e931c375",
          timestamp: new Date(1586171386 * 1000).toISOString(),
          txHash:
            "0x628f8a9aad9d94c38e29787c36837fe8d513c335ec2d06482a3e26dc1a78785a",
        },
      ],
      links: {
        first: "/timestamp/v1/hashes?page[after]=0&page[size]=2",
        last: "/timestamp/v1/hashes?page[after]=2&page[size]=2",
        next: "/timestamp/v1/hashes?page[after]=8570872&page[size]=2",
        prev: "/timestamp/v1/hashes?page[after]=8570872&page[size]=2",
      },
      pageSize: 2,
      self: "/timestamp/v1/hashes",
      total: 2,
    };
    const result = await hashesService.getRecordList(2);
    expect(result).toStrictEqual(expectedRecord);
  });
});
