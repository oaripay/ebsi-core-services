import { describe, beforeAll, it, expect, afterAll } from "vitest";
import crypto from "node:crypto";
import { ethers } from "ethers";
import request from "supertest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ValidationPipe, Logger } from "@nestjs/common";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { RawServerDefault } from "fastify";
import type { TransactionRequest } from "@ethersproject/abstract-provider";
import type { JSONSchema } from "@apidevtools/json-schema-ref-parser/dist/lib/types";
import { prefixWith0x, computeId, waitToBeMined } from "@ebsiint-api/shared";
import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import { AppModule } from "../../src/app.module.js";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter.js";
import type { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface.js";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils.js";
import type { ApiConfig } from "../../src/config/configuration.js";
import { createVerifiableAuthorisationSchema } from "../utils/data.js";
import { hexToMultibaseBase58Btc } from "../../src/modules/schemas/schemas.utils.js";
import { describeWriteOps, writeOps } from "../utils/writeOps.js";
import { getServer } from "../utils/getServer.js";
import type { InsertSchemaSchema } from "../../src/modules/jsonrpc/validators/RequestInsertSchemaSchema.js";
import type { UpdateSchemaSchema } from "../../src/modules/jsonrpc/validators/RequestUpdateSchemaSchema.js";
import type { UpdateMetadataSchema } from "../../src/modules/jsonrpc/validators/RequestUpdateMetadataSchema.js";
import type { UnsignedTransaction } from "../../src/modules/jsonrpc/validators/RequestSendSignedTransactionSchema.js";
import { getTsrWriteAccessToken } from "../utils/getAccessToken.js";
import { getEbsiIssuer } from "../utils/getEbsiIssuer.js";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertSchemaSchema
  | UpdateSchemaSchema
  | UpdateMetadataSchema;

describe("TSR API v4 - Schemas (e2e)", () => {
  let app: NestFastifyApplication;
  let server: RawServerDefault | string;
  let adminTestWallet: ethers.Wallet;
  let testUserAccessToken: string;

  let rawSchema: JSONSchema;
  let schemaId: string;
  let serializedSchema: string;
  let serializedSchemaBuffer: Buffer;
  let schemaRevisionId: string;

  let rawUpdatedSchema: JSONSchema;
  let serializedUpdatedSchema: string;
  let serializedSchemaUpdatedBuffer: Buffer;

  let rawMetadata: Record<string, unknown>;
  let serializedMetadata: string;
  let serializedMetadataBuffer: Buffer;
  let schemaRevisionMetadataId: string;

  let rawMetadata2: Record<string, unknown>;
  let serializedMetadata2: string;
  let serializedMetadataBuffer2: Buffer;

  let rawUpdatedMetadata: Record<string, unknown>;
  let serializedUpdatedMetadata: string;
  let serializedUpdatedMetadataBuffer: Buffer;

  let ledgerApi: string;

  let sampleTransaction: string;

  let blockscout: {
    url: string;
    bearerToken: string;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    // Turn off logger
    Logger.overrideLogger(false);

    const configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    server = getServer(app, configService);
    if (writeOps()) {
      const trustedHostnames = configService.get<string[]>("trustedHostnames");
      const ebsiAuthority = configService
        .get<string>("domain")
        .replace(/^https?:\/\//, "");
      const ebsiEnvConfig = {
        network: configService.get("network", { infer: true }),
        hosts: [ebsiAuthority, ...trustedHostnames],
        services: {
          "did-registry": "v6",
          "trusted-issuers-registry": "v6",
          "trusted-policies-registry": "v4",
          "trusted-schemas-registry": "v4",
        },
      } satisfies EbsiEnvConfiguration;

      const testUserPrivateKeyHex = configService.get<string>(
        "testAdminPrivateKey",
      );
      const testUserKid = configService.get<string>("testAdminKid");
      const testUserDid = testUserKid.split("#")[0]!;
      const testUserIssuerInfo = await getEbsiIssuer(
        testUserPrivateKeyHex,
        testUserDid,
        testUserKid,
      );

      adminTestWallet = new ethers.Wallet(
        prefixWith0x(configService.get("testAdminPrivateKey")),
      );

      const authorisationApiUrl = configService.get<string>(
        "authorisationApiUrl",
      );

      try {
        testUserAccessToken = await getTsrWriteAccessToken(
          authorisationApiUrl,
          testUserIssuerInfo,
          ebsiEnvConfig,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        throw e;
      }
    }

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
    rawSchema = createVerifiableAuthorisationSchema(
      configService.get<string>("testVaSchemaUrl"),
    );

    blockscout = configService.get<{
      url: string;
      bearerToken: string;
    }>("blockscout");
    schemaId = `0x${(await computeId(rawSchema)).toString("hex")}`;

    serializedSchema = JSON.stringify(rawSchema);
    serializedSchemaBuffer = Buffer.from(serializedSchema);
    schemaRevisionId = ethers.utils.sha256(serializedSchemaBuffer);

    rawUpdatedSchema = {
      ...rawSchema,
      description: "Updated schema of an EBSI Verifiable Attestation",
    };
    serializedUpdatedSchema = JSON.stringify(rawUpdatedSchema);
    serializedSchemaUpdatedBuffer = Buffer.from(serializedUpdatedSchema);

    rawMetadata = {
      meta: "value",
      data: crypto.randomBytes(16).toString("hex"),
      validFrom: new Date(Date.now() - 60 * 1000).toISOString(), // -1 minute
      validTo: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // +5 minutes
    };
    serializedMetadata = JSON.stringify(rawMetadata);
    serializedMetadataBuffer = Buffer.from(serializedMetadata);
    schemaRevisionMetadataId = ethers.utils.sha256(serializedMetadataBuffer);

    rawMetadata2 = {
      meta: "value 2",
      data: crypto.randomBytes(16).toString("hex"),
      validFrom: new Date(Date.now() - 60 * 1000).toISOString(), // -1 minute
      validTo: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // +5 minutes
    };
    serializedMetadata2 = JSON.stringify(rawMetadata2);
    serializedMetadataBuffer2 = Buffer.from(serializedMetadata2);
    rawUpdatedMetadata = {
      meta: "value updated",
      data: crypto.randomBytes(16).toString("hex"),
      validFrom: new Date(Date.now() - 60 * 1000).toISOString(), // -1 minute
      validTo: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // +5 minutes
    };
    serializedUpdatedMetadata = JSON.stringify(rawUpdatedMetadata);
    serializedUpdatedMetadataBuffer = Buffer.from(serializedUpdatedMetadata);
  });

  afterAll(async () => {
    await app.close();
  });

  describeWriteOps().each(["insertSchema", "updateSchema", "updateMetadata"])(
    "/jsonrpc - send transaction for %s",
    (method: string) => {
      it("should work", async () => {
        expect.assertions(5);

        let params: JsonRpcParams | null = null;

        switch (method) {
          case "insertSchema": {
            params = {
              from: adminTestWallet.address,
              schemaId,
              schema: `0x${serializedSchemaBuffer.toString("hex")}`,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
            } satisfies InsertSchemaSchema;
            break;
          }
          case "updateSchema": {
            params = {
              from: adminTestWallet.address,
              schemaId,
              schema: `0x${serializedSchemaUpdatedBuffer.toString("hex")}`,
              metadata: `0x${serializedUpdatedMetadataBuffer.toString("hex")}`,
            } satisfies UpdateSchemaSchema;
            break;
          }
          case "updateMetadata": {
            params = {
              from: adminTestWallet.address,
              schemaRevisionId,
              metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
            } satisfies UpdateMetadataSchema;
            break;
          }
          default: {
            throw new Error(`Test Error: Invalid method ${method}`);
          }
        }

        const responseBuild: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testUserAccessToken, { type: "bearer" })
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
            chainId: expect.any(String),
            data: expect.any(String),
            from: adminTestWallet.address,
            gasLimit: expect.any(String),
            gasPrice: expect.any(String),
            nonce: expect.any(String),
            to: expect.any(String),
            value: expect.any(String),
          },
        });
        expect(responseBuild.status).toBe(200);

        const unsignedTransaction = responseBuild.body.result;
        const uTx = formatEthersUnsignedTransaction(
          JSON.parse(
            JSON.stringify(unsignedTransaction),
          ) as unknown as UnsignedTransaction,
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await adminTestWallet.signTransaction(
          uTx as TransactionRequest,
        );
        const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

        const responseSend: SupertestJsonRpcResponse = await request(server)
          .post("/jsonrpc")
          .auth(testUserAccessToken, { type: "bearer" })
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
          result: expect.any(String),
        });
        expect(responseSend.status).toBe(200);

        // wait to be mined
        const receipt = await waitToBeMined(
          ledgerApi,
          responseSend.body.result as string,
        );
        expect(receipt.status).toBe(1);
        sampleTransaction = responseSend.body.result as string;
      });

      it("should return transaction data from blockscout", async () => {
        if (!blockscout.url || !sampleTransaction) return;

        expect.assertions(1);

        await new Promise((f) => {
          setTimeout(f, 5000);
        });

        // check if blockscout is working properly
        const blockscoutCheck = await request(blockscout.url)
          .get(`/tx/${sampleTransaction}`)
          .set({ Authorization: blockscout.bearerToken });

        expect(blockscoutCheck.status).toBe(200);
      });
    },
  );

  describe("GET /schemas", () => {
    it("should return a paginated collection of schemas", async () => {
      expect.assertions(2);

      const response = await request(server).get("/schemas");

      expect(response.body).toStrictEqual({
        self: expect.stringContaining("/schemas?page[after]=1&page[size]=10"),
        items: expect.arrayContaining([]),
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10",
          ),
          prev: expect.stringContaining("/schemas?page[after]=1&page[size]=10"),
          next: expect.stringContaining("/schemas?page[after]="),
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /schemas/{schemaId}", () => {
    describeWriteOps()("Test requiring actual data", () => {
      beforeAll(async () => {
        // wait some seconds to update the subgraph
        await new Promise((r) => {
          setTimeout(r, 6000);
        });
      });

      it("should return a specific schema identified by an hexadecimal schema ID", async () => {
        expect.assertions(3);

        const response = await request(server).get(`/schemas/${schemaId}`);

        expect(response.body).toStrictEqual(rawUpdatedSchema);
        expect(response.status).toBe(200);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/json"));
      });

      it("should return a specific schema identified by a multibase base58btc schema ID", async () => {
        expect.assertions(3);

        const multibaseSchemaId = hexToMultibaseBase58Btc(schemaId);

        const response = await request(server).get(
          `/schemas/${multibaseSchemaId}`,
        );

        expect(response.body).toStrictEqual(rawUpdatedSchema);
        expect(response.status).toBe(200);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/json"));
      });
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeId = `0x${crypto.randomBytes(16).toString("hex")}`;

      const response = await request(server).get(`/schemas/${fakeId}`);

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });
  });

  describe("GET /schemas/{schemaId}/revisions", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        "/schemas/no-schema/revisions",
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/schemas/${fakeId}/revisions`,
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if valid-at query parameter is not valid", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions?valid-at=yesterday`,
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["valid-at must be a valid ISO 8601 date string"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(12);

      const response1 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[size]=100`,
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);
      expect(
        (response1.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response2 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[size]=0`,
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);
      expect(
        (response2.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response3 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[after]=0`,
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);
      expect(
        (response3.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response4 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[after]=abc`,
      );
      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
      expect(
        (response4.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    describeWriteOps()("Test requiring actual data", () => {
      it("should return the revisions of the specified schema", async () => {
        expect.assertions(3);

        const response = await request(server).get(
          `/schemas/${schemaId}/revisions`,
        );

        const revisionId2 = ethers.utils.sha256(
          Buffer.from(serializedUpdatedSchema),
        );

        expect(response.body).toStrictEqual({
          items: expect.arrayContaining([
            {
              href: expect.stringContaining(
                `/schemas/${schemaId}/revisions/${schemaRevisionId}`,
              ),
              schemaRevisionId,
            },
            {
              href: expect.stringContaining(
                `/schemas/${schemaId}/revisions/${revisionId2}`,
              ),
              schemaRevisionId: revisionId2,
            },
          ]),
          links: {
            first: expect.stringContaining(
              `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`,
            ),
            last: expect.stringContaining(
              `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`,
            ),
            next: expect.stringContaining(
              `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`,
            ),
            prev: expect.stringContaining(
              `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`,
            ),
          },
          pageSize: 10,
          self: expect.stringContaining(
            `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`,
          ),
        });
        expect(response.status).toBe(200);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/json"));
      });

      it("should return the revisions valid at a specific time of the specified schema", async () => {
        expect.assertions(3);

        const response = await request(server).get(
          `/schemas/${schemaId}/revisions?valid-at${new Date().toISOString()}`,
        );

        const revisionId2 = ethers.utils.sha256(
          Buffer.from(serializedUpdatedSchema),
        );

        expect(response.body).toStrictEqual({
          items: expect.arrayContaining([
            {
              href: expect.stringContaining(
                `/schemas/${schemaId}/revisions/${schemaRevisionId}`,
              ),
              schemaRevisionId,
            },
            {
              href: expect.stringContaining(
                `/schemas/${schemaId}/revisions/${revisionId2}`,
              ),
              schemaRevisionId: revisionId2,
            },
          ]),
          links: {
            first: expect.stringContaining(
              `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`,
            ),
            last: expect.stringContaining(
              `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`,
            ),
            next: expect.stringContaining(
              `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`,
            ),
            prev: expect.stringContaining(
              `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`,
            ),
          },
          pageSize: 10,
          self: expect.stringContaining(
            `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`,
          ),
        });
        expect(response.status).toBe(200);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/json"));
      });
    });
  });

  describe("GET /schemas/{schemaId}/revisions/{schemaRevisionId}", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/no-schema/revisions/${fakeSchemaRevisionId}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/${fakeSchemaRevisionId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeSchemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/no-revision`,
      );

      expect(response.body).toStrictEqual({
        detail:
          '["schemaRevisionId must be a hexadecimal number","schemaRevisionId must match /^0x/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    describeWriteOps()("Test requiring actual data", () => {
      it("should throw an error if the schema revision is not found", async () => {
        expect.assertions(3);

        const fakeSchemaRevisionId = `0x${crypto
          .randomBytes(32)
          .toString("hex")}`;

        const response = await request(server).get(
          `/schemas/${schemaId}/revisions/${fakeSchemaRevisionId}`,
        );

        expect(response.body).toStrictEqual({
          title: "Revision Not Found",
          status: 404,
          detail: `Revision ${fakeSchemaRevisionId} not found`,
          type: "about:blank",
        });
        expect(response.status).toBe(404);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/problem+json"));
      });

      it("should return a specific schema revision", async () => {
        expect.assertions(3);

        const response = await request(server).get(
          `/schemas/${schemaId}/revisions/${schemaRevisionId}`,
        );

        expect(response.body).toStrictEqual(rawSchema);
        expect(response.status).toBe(200);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/json"));
      });
    });
  });

  describe("GET /schemas/{schemaId}/revisions/{schemaRevisionId}/metadata", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/no-schema/revisions/${fakeSchemaRevisionId}/metadata`,
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/${fakeSchemaRevisionId}/metadata`,
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeSchemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/no-revision/metadata`,
      );

      expect(response.body).toStrictEqual({
        detail:
          '["schemaRevisionId must be a hexadecimal number","schemaRevisionId must match /^0x/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    describeWriteOps()("Test requiring actual data", () => {
      it("should throw an error if the schema revision is not found", async () => {
        expect.assertions(3);

        const fakeSchemaRevisionId = `0x${crypto
          .randomBytes(32)
          .toString("hex")}`;

        const response = await request(server).get(
          `/schemas/${schemaId}/revisions/${fakeSchemaRevisionId}/metadata`,
        );

        expect(response.body).toStrictEqual({
          title: "Revision Not Found",
          status: 404,
          detail: `Revision ${fakeSchemaRevisionId} not found`,
          type: "about:blank",
        });
        expect(response.status).toBe(404);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/problem+json"));
      });

      it("should return the metadata of the specified schema revision", async () => {
        expect.assertions(3);

        const response = await request(server).get(
          `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata`,
        );

        expect(response.body).toStrictEqual({
          items: expect.arrayContaining([
            {
              href: expect.stringContaining(
                `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/${schemaRevisionMetadataId}`,
              ),
              metadataId: schemaRevisionMetadataId,
            },
          ]),
          links: {
            first: expect.stringContaining(
              `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata?page[after]=1&page[size]=10`,
            ),
            last: expect.stringContaining(
              `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata?page[after]=1&page[size]=10`,
            ),
            next: expect.stringContaining(
              `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata?page[after]=1&page[size]=10`,
            ),
            prev: expect.stringContaining(
              `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata?page[after]=1&page[size]=10`,
            ),
          },
          pageSize: 10,
          self: expect.stringContaining(
            `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata?page[after]=1&page[size]=10`,
          ),
        });
        expect(response.status).toBe(200);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/json"));
      });
    });
  });

  describe("GET /schemas/{schemaId}/revisions/{schemaRevisionId}/metadata/{metadataId}", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const fakeSchemaMetadataId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/no-schema/revisions/${fakeSchemaRevisionId}/metadata/${fakeSchemaMetadataId}`,
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;
      const fakeSchemaMetadataId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/${fakeSchemaRevisionId}/metadata/${fakeSchemaMetadataId}`,
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeSchemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const fakeSchemaMetadataId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/no-revision/metadata/${fakeSchemaMetadataId}`,
      );

      expect(response.body).toStrictEqual({
        detail:
          '["schemaRevisionId must be a hexadecimal number","schemaRevisionId must match /^0x/ regular expression"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"],
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    describeWriteOps()("Test requiring actual data", () => {
      it("should throw an error if the schema revision is not found", async () => {
        expect.assertions(3);

        const fakeSchemaRevisionId = `0x${crypto
          .randomBytes(32)
          .toString("hex")}`;
        const fakeSchemaMetadataId = `0x${crypto
          .randomBytes(32)
          .toString("hex")}`;

        const response = await request(server).get(
          `/schemas/${schemaId}/revisions/${fakeSchemaRevisionId}/metadata/${fakeSchemaMetadataId}`,
        );

        expect(response.body).toStrictEqual({
          title: "Revision Not Found",
          status: 404,
          detail: `Revision ${fakeSchemaRevisionId} not found`,
          type: "about:blank",
        });
        expect(response.status).toBe(404);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/problem+json"));
      });

      it("should throw an error if the schema revision metadata ID is not hexadecimal", async () => {
        expect.assertions(3);

        const response = await request(server).get(
          `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/no-metadata`,
        );

        expect(response.body).toStrictEqual({
          detail:
            '["metadataId must be a hexadecimal number","metadataId must match /^0x/ regular expression"]',
          status: 400,
          title: "Bad Request",
          type: "about:blank",
        });
        expect(response.status).toBe(400);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/problem+json"));
      });

      it("should return a specific schema revision metadata", async () => {
        expect.assertions(3);

        const response = await request(server).get(
          `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/${schemaRevisionMetadataId}`,
        );

        expect(response.body).toStrictEqual(rawMetadata);
        expect(response.status).toBe(200);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/ld+json"));
      });

      it("should throw an error if the schema revision metadata is not found", async () => {
        expect.assertions(3);

        const fakeSchemaMetadataId = `0x${crypto
          .randomBytes(32)
          .toString("hex")}`;

        const response = await request(server).get(
          `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/${fakeSchemaMetadataId}`,
        );

        expect(response.body).toStrictEqual({
          title: "Metadata Not Found",
          status: 404,
          detail: `Metadata ${fakeSchemaMetadataId} not found`,
          type: "about:blank",
        });
        expect(response.status).toBe(404);
        expect(
          (response.headers as { "content-type": string })["content-type"],
        ).toStrictEqual(expect.stringContaining("application/problem+json"));
      });
    });
  });
});
