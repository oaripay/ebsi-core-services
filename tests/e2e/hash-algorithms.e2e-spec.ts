import { ethers } from "ethers";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  HttpServer,
  Logger,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import { HashName } from "multihashes";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import {
  InsertHashAlgorithmParam,
  UnsignedTransaction,
  UpdateHashAlgorithmParam,
} from "../../src/modules/jsonrpc/dto";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { HashAlgorithmLink } from "../../src/modules/hash-algorithms/hash-algorithms.interface";
import { ApiConfig } from "../../src/config/configuration";
import { prefixWith0x } from "../../src/shared/utils";
import { getAccessToken, waitToBeMined } from "../utils/waitToBeMined";
import { requestSiopJwt } from "../utils/auth";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams = InsertHashAlgorithmParam | UpdateHashAlgorithmParam;

const validHashAlgorithms: Record<
  string,
  { outputLength: number; multihash: HashName; oid: string }
> = {
  "sha-256": {
    outputLength: 256,
    multihash: "sha2-256",
    oid: "2.16.840.1.101.3.4.2.1",
  },
  "sha-512": {
    outputLength: 512,
    multihash: "sha2-512",
    oid: "2.16.840.1.101.3.4.2.3",
  },
  "sha3-224": {
    outputLength: 224,
    multihash: "sha3-224",
    oid: "2.16.840.1.101.3.4.2.7",
  },
  "sha3-256": {
    outputLength: 256,
    multihash: "sha3-256",
    oid: "2.16.840.1.101.3.4.2.8",
  },
  "sha3-384": {
    outputLength: 384,
    multihash: "sha3-384",
    oid: "2.16.840.1.101.3.4.2.9",
  },
  "sha3-512": {
    outputLength: 512,
    multihash: "sha3-512",
    oid: "2.16.840.1.101.3.4.2.10",
  },
} as const;

describe("HashAlgorithms (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let testAdmin: {
    kid: string;
    privateKey: string;
    wallet: ethers.Wallet;
    token?: string;
  };
  let testUser: {
    kid: string;
    privateKey: string;
    token?: string;
  };
  let apiAccessToken: string;
  let ledgerApi: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    // Turn off logger
    Logger.overrideLogger(false);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();
    server = app.getHttpServer() as HttpServer;

    const configService =
      moduleFixture.get<ConfigService<ApiConfig>>(ConfigService);
    const authorisationApiUrl = configService.get<string>(
      "authorisationApiUrl"
    );
    const trustedAppsRegistryApiUrl = configService.get<string>(
      "trustedAppsRegistryApiUrl"
    );

    const configAdmin = configService.get<{
      kid: string;
      privateKey: string;
    }>("testAdmin");

    testUser = configService.get<{
      kid: string;
      privateKey: string;
    }>("testUser");

    testAdmin = {
      ...configAdmin,
      wallet: new ethers.Wallet(prefixWith0x(configAdmin.privateKey)),
    };

    testUser.token = await requestSiopJwt({
      clientKid: testUser.kid,
      clientPrivateKey: testUser.privateKey,
      authorisationApiUrl,
      trustedAppsRegistryApiUrl,
    });

    testAdmin.token = await requestSiopJwt({
      clientKid: testAdmin.kid,
      clientPrivateKey: testAdmin.privateKey,
      authorisationApiUrl,
      trustedAppsRegistryApiUrl,
    });

    apiAccessToken = await getAccessToken(configService);
    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
  });

  describe("GET /hash-algorithms", () => {
    it("should return a paginated collection of hash algorithms", async () => {
      expect.assertions(2);

      const response = await request(server).get("/hash-algorithms");
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/hash-algorithms?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/hash-algorithms?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/hash-algorithms?page[after]="
          ) as string,
          last: expect.stringContaining(
            "/hash-algorithms?page[after]="
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /hash-algorithms/{hashAlgorithmId}", () => {
    it("should return a specific hash algorithm", async () => {
      expect.assertions(2);

      const respHashAlgorithms = await request(server).get("/hash-algorithms");
      const { hashAlgorithmId } = (
        respHashAlgorithms.body as {
          items: HashAlgorithmLink[];
        }
      ).items[0];

      const response = await request(server).get(
        `/hash-algorithms/${hashAlgorithmId}`
      );

      expect(response.body).toStrictEqual({
        ianaName: expect.any(String) as string,
        oid: expect.any(String) as string,
        outputLengthBits: expect.any(Number) as number,
        status: expect.any(String) as string,
        multihash: expect.any(String) as string,
      });
      expect(response.status).toBe(200);
    });

    it("should throw an error if the hash algorithm is not found", async () => {
      expect.assertions(2);

      const hashAlgorithmId = Math.floor(Math.random() * 10000) + 10000; // some random number between 10,000 and 20,000

      const response = await request(server).get(
        `/hash-algorithms/${hashAlgorithmId}`
      );

      expect(response.body).toStrictEqual({
        title: "Hash algorithm Not Found",
        status: 404,
        detail: `Hash algorithm ${hashAlgorithmId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe.each(["insertHashAlgorithm", "updateHashAlgorithm"])(
    "/jsonrpc - send transaction for %s",
    (method: string) => {
      it("should work", async () => {
        expect.assertions(5);

        let params: JsonRpcParams = null;

        switch (method) {
          case "insertHashAlgorithm": {
            const hashes = Object.keys(validHashAlgorithms);
            const randomHash =
              hashes[Math.floor(Math.random() * hashes.length)];

            params = {
              from: testAdmin.wallet.address,
              outputLength: validHashAlgorithms[randomHash].outputLength,
              ianaName: randomHash,
              oid: validHashAlgorithms[randomHash].oid,
              status: 1,
              multihash: validHashAlgorithms[randomHash].multihash,
            } as InsertHashAlgorithmParam;
            break;
          }
          case "updateHashAlgorithm": {
            const response = await request(server).get("/hash-algorithms");
            const hashAlgorithmId =
              (response.body as { total: number }).total - 1;

            const hashes = Object.keys(validHashAlgorithms);
            const randomHash =
              hashes[Math.floor(Math.random() * hashes.length)];

            params = {
              from: testAdmin.wallet.address,
              hashAlgorithmId,
              outputLength: validHashAlgorithms[randomHash].outputLength,
              ianaName: randomHash,
              oid: validHashAlgorithms[randomHash].oid,
              status: 1,
              multihash: validHashAlgorithms[randomHash].multihash,
            } as UpdateHashAlgorithmParam;
            break;
          }
          default:
            throw new Error(`Test Error: Invalid method ${method}`);
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testAdmin.token, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method,
            params: [params],
            id: 231,
          });

        expect(responseBuild.body).toStrictEqual({
          jsonrpc: "2.0",
          id: 231,
          result: {
            chainId: expect.any(String) as string,
            data: expect.any(String) as string,
            from: testAdmin.wallet.address,
            gasLimit: expect.any(String) as string,
            gasPrice: expect.any(String) as string,
            nonce: expect.any(String) as string,
            to: expect.any(String) as string,
            value: expect.any(String) as string,
          },
        });
        expect(responseBuild.status).toBe(200);

        const unsignedTransaction = responseBuild.body.result;
        const uTx = formatEthersUnsignedTransaction(
          JSON.parse(
            JSON.stringify(unsignedTransaction)
          ) as unknown as UnsignedTransaction
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await testAdmin.wallet.signTransaction(uTx);
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

        const responseSend: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testAdmin.token, { type: "bearer" })
          .send({
            jsonrpc: "2.0",
            method: "sendSignedTransaction",
            params: [
              {
                protocol: "eth",
                unsignedTransaction,
                r,
                s,
                v: `0x${Number(v).toString(16)}`,
                signedRawTransaction: sgnTx,
              },
            ],
            id: "45",
          });

        expect(responseSend.body).toStrictEqual({
          jsonrpc: "2.0",
          id: "45",
          result: expect.any(String) as string,
        });
        expect(responseSend.status).toBe(200);

        // wait to be mined
        const receipt = await waitToBeMined(
          ledgerApi,
          apiAccessToken,
          responseSend.body.result as string
        );
        expect(receipt.status).toBe(1);
      });
    }
  );

  it("should reject impersonating transactions: admin wallet using jwt from user", async () => {
    expect.assertions(2);

    const hashes = Object.keys(validHashAlgorithms);
    const randomHash = hashes[Math.floor(Math.random() * hashes.length)];

    const param = {
      from: testAdmin.wallet.address,
      outputLength: validHashAlgorithms[randomHash].outputLength,
      ianaName: randomHash,
      oid: validHashAlgorithms[randomHash].oid,
      status: 1,
      multihash: validHashAlgorithms[randomHash].multihash,
    } as InsertHashAlgorithmParam;

    const responseBuild: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(testUser.token, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "insertHashAlgorithm",
        params: [param],
        id: 231,
      });

    const unsignedTransaction = responseBuild.body.result;
    const uTx = formatEthersUnsignedTransaction(
      JSON.parse(
        JSON.stringify(unsignedTransaction)
      ) as unknown as UnsignedTransaction
    );
    uTx.chainId = Number(uTx.chainId);
    const sgnTx = await testAdmin.wallet.signTransaction(uTx);
    const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

    const responseSend: SupertestJsonRpcResponse = await request(server)
      .post("/jsonrpc")
      .auth(testUser.token, { type: "bearer" })
      .send({
        jsonrpc: "2.0",
        method: "sendSignedTransaction",
        params: [
          {
            protocol: "eth",
            unsignedTransaction,
            r,
            s,
            v: `0x${Number(v).toString(16)}`,
            signedRawTransaction: sgnTx,
          },
        ],
        id: "45",
      });

    expect(responseSend.body).toStrictEqual({
      jsonrpc: "2.0",
      id: "45",
      error: {
        code: -32600,
        message: `The DID ${
          testUser.kid.split("#")[0]
        } is not controlled by the address ${testAdmin.wallet.address.toLowerCase()}`,
      },
    });
    expect(responseSend.status).toBe(400);
  });
});
