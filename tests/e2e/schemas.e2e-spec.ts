import crypto from "crypto";
import { ethers } from "ethers";
import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import {
  INestApplication,
  ValidationPipe,
  Logger,
  HttpServer,
} from "@nestjs/common";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import type { FastifyInstance } from "fastify";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import {
  InsertSchemaParam,
  UnsignedTransaction,
  UpdateMetadataParam,
  UpdateSchemaParam,
} from "../../src/modules/jsonrpc/dto";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { ApiConfig } from "../../src/config/configuration";
import { prefixWith0x } from "../../src/shared/utils";
import { computeId } from "../../src/shared/utils/jsonSchema.utils";
import { getAccessToken, waitToBeMined } from "../utils/waitToBeMined";
import { ItemsList } from "../../src/modules/schemas/schemas.interface";
import { requestSiopJwt } from "../utils/siopJwt";
import { createVerifiableAuthorisationSchema } from "../utils/data";
import { hexToMultibaseBase58Btc } from "../../src/modules/schemas/schemas.utils";

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

type JsonRpcParams =
  | InsertSchemaParam
  | UpdateSchemaParam
  | UpdateMetadataParam;

describe("Schemas (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let adminTestWallet: ethers.Wallet;
  let testUserAccessToken: string;

  let rawSchema: $RefParser.JSONSchema;
  let schemaId: string;
  let serializedSchema: string;
  let serializedSchemaBuffer: Buffer;
  let schemaRevisionId: string;

  let rawUpdatedSchema: $RefParser.JSONSchema;
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
  let apiAccessToken: string;

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

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("testAdminPrivateKey"))
    );

    // Generate a valid Client JWT (SIOP) for the tests
    testUserAccessToken = await requestSiopJwt({
      clientKid: configService.get<string>("testAdminKid"),
      clientPrivateKey: configService.get<string>("testAdminPrivateKey"),
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
      trustedAppsRegistryUrl: `${configService.get<string>("tarApiUrl")}`,
    });

    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;
    apiAccessToken = await getAccessToken(configService);

    rawSchema = createVerifiableAuthorisationSchema(
      configService.get<string>("testVaSchemaUrl")
    );

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

  describe.each(["insertSchema", "updateSchema", "updateMetadata"])(
    "/jsonrpc - send transaction for %s",
    (method: string) => {
      it("should work", async () => {
        expect.assertions(5);

        let params: JsonRpcParams = null;

        switch (method) {
          case "insertSchema": {
            params = {
              from: adminTestWallet.address,
              schemaId,
              schema: `0x${serializedSchemaBuffer.toString("hex")}`,
              metadata: `0x${serializedMetadataBuffer.toString("hex")}`,
            } as InsertSchemaParam;
            break;
          }
          case "updateSchema": {
            params = {
              from: adminTestWallet.address,
              schemaId,
              schema: `0x${serializedSchemaUpdatedBuffer.toString("hex")}`,
              metadata: `0x${serializedUpdatedMetadataBuffer.toString("hex")}`,
            } as UpdateSchemaParam;
            break;
          }
          case "updateMetadata": {
            params = {
              from: adminTestWallet.address,
              schemaRevisionId,
              metadata: `0x${serializedMetadataBuffer2.toString("hex")}`,
            } as UpdateMetadataParam;
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
            chainId: expect.any(String) as string,
            data: expect.any(String) as string,
            from: adminTestWallet.address,
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
        const sgnTx = await adminTestWallet.signTransaction(uTx);
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

  describe("GET /schemas", () => {
    it("should return a paginated collection of schemas", async () => {
      expect.assertions(2);

      const response = await request(server).get("/schemas");

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/schemas?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/schemas?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining("/schemas?page[after]=") as string,
          last: expect.stringContaining("/schemas?page[after]=") as string,
        },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /schemas/{schemaId}", () => {
    it("should return a specific schema identified by an hexadecimal schema ID", async () => {
      expect.assertions(3);

      const response = await request(server).get(`/schemas/${schemaId}`);

      expect(response.body).toStrictEqual(rawUpdatedSchema);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });

    it("should return a specific schema identified by a multibase base58btc schema ID", async () => {
      expect.assertions(3);

      const multibaseSchemaId = hexToMultibaseBase58Btc(schemaId);

      const response = await request(server).get(
        `/schemas/${multibaseSchemaId}`
      );

      expect(response.body).toStrictEqual(rawUpdatedSchema);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
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
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });
  });

  describe("GET /schemas/{schemaId}/revisions", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        "/schemas/no-schema/revisions"
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const response = await request(server).get(
        `/schemas/${fakeId}/revisions`
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if valid-at query parameter is not valid", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions?valid-at=yesterdat`
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["valid-at must be a valid ISO 8601 date string"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(12);

      const response1 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[size]=100`
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);
      expect(
        (response1.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response2 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[size]=0`
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);
      expect(
        (response2.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response3 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[after]=0`
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);
      expect(
        (response3.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));

      const response4 = await request(server).get(
        `/schemas/${schemaId}/revisions?page[after]=abc`
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
        (response4.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return the revisions of the specified schema", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions`
      );

      const revisionId2 = ethers.utils.sha256(
        Buffer.from(serializedUpdatedSchema)
      );

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          {
            href: expect.stringContaining(
              `/schemas/${schemaId}/revisions/${schemaRevisionId}`
            ) as string,
            schemaRevisionId,
          },
          {
            href: expect.stringContaining(
              `/schemas/${schemaId}/revisions/${revisionId2}`
            ) as string,
            schemaRevisionId: revisionId2,
          },
        ]) as ItemsList[],
        links: {
          first: expect.stringContaining(
            `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        total: expect.any(Number) as number,
      });
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });

    it("should return the revisions valid at a specific time of the specified schema", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions?valid-at${new Date().toISOString()}`
      );

      const revisionId2 = ethers.utils.sha256(
        Buffer.from(serializedUpdatedSchema)
      );

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          {
            href: expect.stringContaining(
              `/schemas/${schemaId}/revisions/${schemaRevisionId}`
            ) as string,
            schemaRevisionId,
          },
          {
            href: expect.stringContaining(
              `/schemas/${schemaId}/revisions/${revisionId2}`
            ) as string,
            schemaRevisionId: revisionId2,
          },
        ]) as ItemsList[],
        links: {
          first: expect.stringContaining(
            `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`
          ) as string,
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/schemas/${schemaId}/revisions?page[after]=1&page[size]=10`
        ) as string,
        total: expect.any(Number) as number,
      });
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });
  });

  describe("GET /schemas/{schemaId}/revisions/{schemaRevisionId}", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/no-schema/revisions/${fakeSchemaRevisionId}`
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/${fakeSchemaRevisionId}`
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeSchemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/no-revision`
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
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision is not found", async () => {
      expect.assertions(3);

      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${fakeSchemaRevisionId}`
      );

      expect(response.body).toStrictEqual({
        title: "Revision Not Found",
        status: 404,
        detail: `Revision ${fakeSchemaRevisionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a specific schema revision", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}`
      );

      expect(response.body).toStrictEqual(rawSchema);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });
  });

  describe("GET /schemas/{schemaId}/revisions/{schemaRevisionId}/metadata", () => {
    it("should throw an error if the schema ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/no-schema/revisions/${fakeSchemaRevisionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema is not found", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/${fakeSchemaRevisionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeSchemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/no-revision/metadata`
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
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision is not found", async () => {
      expect.assertions(3);

      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${fakeSchemaRevisionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        title: "Revision Not Found",
        status: 404,
        detail: `Revision ${fakeSchemaRevisionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return the metadata of the specified schema revision", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        items: expect.arrayContaining([
          {
            href: expect.stringContaining(
              `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/${schemaRevisionMetadataId}`
            ) as string,
            metadataId: schemaRevisionMetadataId,
          },
        ]) as ItemsList[],
        links: {
          first: expect.stringContaining(
            `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
        },
        pageSize: 10,
        self: expect.stringContaining(
          `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata?page[after]=1&page[size]=10`
        ) as string,
        total: expect.any(Number) as number,
      });
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
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
        `/schemas/no-schema/revisions/${fakeSchemaRevisionId}/metadata/${fakeSchemaMetadataId}`
      );

      expect(response.body).toStrictEqual({
        detail: '["schemaId must be a valid schema ID"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
      expect(
        (response.headers as { "content-type": string })["content-type"]
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
        `/schemas/${fakeSchemaId}/revisions/${fakeSchemaRevisionId}/metadata/${fakeSchemaMetadataId}`
      );

      expect(response.body).toStrictEqual({
        title: "Schema Not Found",
        status: 404,
        detail: `Schema ${fakeSchemaId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision ID is not hexadecimal", async () => {
      expect.assertions(3);

      const fakeSchemaId = `0x${crypto.randomBytes(32).toString("hex")}`;
      const fakeSchemaMetadataId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${fakeSchemaId}/revisions/no-revision/metadata/${fakeSchemaMetadataId}`
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
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision is not found", async () => {
      expect.assertions(3);

      const fakeSchemaRevisionId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;
      const fakeSchemaMetadataId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${fakeSchemaRevisionId}/metadata/${fakeSchemaMetadataId}`
      );

      expect(response.body).toStrictEqual({
        title: "Revision Not Found",
        status: 404,
        detail: `Revision ${fakeSchemaRevisionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision metadata ID is not hexadecimal", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/no-metadata`
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
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should throw an error if the schema revision metadata is not found", async () => {
      expect.assertions(3);

      const fakeSchemaMetadataId = `0x${crypto
        .randomBytes(32)
        .toString("hex")}`;

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/${fakeSchemaMetadataId}`
      );

      expect(response.body).toStrictEqual({
        title: "Metadata Not Found",
        status: 404,
        detail: `Metadata ${fakeSchemaMetadataId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/problem+json"));
    });

    it("should return a specific schema revision metadata", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/schemas/${schemaId}/revisions/${schemaRevisionId}/metadata/${schemaRevisionMetadataId}`
      );

      expect(response.body).toStrictEqual(rawMetadata);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/ld+json"));
    });
  });
});
