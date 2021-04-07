import crypto from "crypto";
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
import { FastifyInstance } from "fastify";
import * as bs58 from "bs58";
import { canonize } from "jsonld";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { ApiConfig } from "../../src/config/configuration";
import { multihashEncode, prefixWith0x } from "../../src/shared/utils";
import { waitToBeMined } from "../utils/waitToBeMined";
import {
  InsertDidControllerParam,
  InsertDidDocumentParam,
  InsertDidMethodParam,
  RevokeDidControllerParam,
  UpdateDidDocumentParam,
  UpdateDidMethodParam,
  AppendDidDocumentVersionHashParam,
  DetachDidDocumentVersionParam,
  AppendDidDocumentVersionMetadataParam,
  DetachDidDocumentVersionMetadataParam,
  UpdateDidControllerParam,
} from "../../src/modules/jsonrpc/dto";
import { DidMethodResponseObject } from "../../src/modules/did-methods/did-methods.interface";
import {
  DidTimestampResponseObject,
  TimestampLink,
} from "../../src/modules/did-timestamps/did-timestamps.interface";

type JsonRpcParams =
  | InsertDidDocumentParam
  | InsertDidControllerParam
  | RevokeDidControllerParam
  | InsertDidMethodParam
  | UpdateDidMethodParam
  | AppendDidDocumentVersionHashParam
  | DetachDidDocumentVersionParam
  | AppendDidDocumentVersionMetadataParam
  | DetachDidDocumentVersionMetadataParam
  | UpdateDidDocumentParam
  | UpdateDidControllerParam;

interface SupertestJsonRpcResponse {
  status: number;
  body: JsonRpcResponseObject;
}

interface DidDocumentDataset {
  didDocument: { [x: string]: unknown };
  didDocumentBuffer: Buffer;
  canonizedDidDocument: string;
  canonizedDidDocumentBuffer: Buffer;
  canonizedDidDocumentHash: string;
  controllerDid: string;
  timestampDataBuffer: Buffer;
  didVersionMetadataBuffer: Buffer;
}

interface DidMethodDataset {
  methodName: string;
  ledgerName: string;
  didMethods: { [x: string]: unknown }[];
  didMethodsBuffer: Buffer[];
  canonizedDidMethods: string[];
  canonizedDidMethodsBuffer: Buffer[];
  canonizedDidMethodsHash: string[];
  methodSpec: string[];
  methodSpecHash: string[];
  notBefore: number;
  notAfter: number;
  status: number;
}

describe("DID Registry (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let adminTestWallet: ethers.Wallet;

  const createDid = (): string => {
    const buf = crypto.randomBytes(32);
    return `did:ebsi:${bs58.encode(buf)}`;
  };

  const controllerDid = createDid();

  const createDidDocument = async (
    did: string
  ): Promise<DidDocumentDataset> => {
    const didDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://identity.foundation/EcdsaSecp256k1RecoverySignature2020/lds-ecdsa-secp256k1-recovery2020-0.0.jsonld",
      ],
      id: did,
      publicKey: [
        {
          id: `${did}#vm-3`,
          controller: did,
          type: "EcdsaSecp256k1RecoveryMethod2020",
          blockchainAccountId: `0x${crypto
            .randomBytes(16)
            .toString("hex")}@eip155:1`,
        },
      ],
    };

    const didDocumentBuffer = Buffer.from(JSON.stringify(didDocument));

    const canonizedDidDocument = await canonize(didDocument, {
      algorithm: "URDNA2015",
      format: "application/n-quads",
    });

    const canonizedDidDocumentBuffer = Buffer.from(canonizedDidDocument);
    const canonizedDidDocumentHash = ethers.utils.sha256(
      canonizedDidDocumentBuffer
    );

    const timestampDataBuffer = Buffer.from(JSON.stringify({ data: "test" }));
    const didVersionMetadataBuffer = Buffer.from(
      JSON.stringify({ metadata: "value" })
    );

    return {
      didDocument,
      didDocumentBuffer,
      canonizedDidDocument,
      canonizedDidDocumentBuffer,
      canonizedDidDocumentHash,
      controllerDid: did,
      timestampDataBuffer,
      didVersionMetadataBuffer,
    };
  };

  const createDidMethod = async (): Promise<DidMethodDataset> => {
    const methodName = `did:ebsi-${crypto.randomBytes(8).toString("hex")}`;
    const rand1 = crypto.randomBytes(32).toString("hex");
    const rand2 = crypto.randomBytes(32).toString("hex");
    const didMethod = {
      "@context": "https://json-ld.org/contexts/person.jsonld",
      "@id": `http://dbpedia.org/resource/${rand1}`,
      name: rand1,
      born: "1940-10-09",
      spouse: `http://dbpedia.org/resource/${rand2}`,
    };

    const didMethodBuffer = Buffer.from(JSON.stringify(didMethod));

    // Canonize DID Method
    const canonizedDidMethod = await canonize(didMethod, {
      algorithm: "URDNA2015",
      format: "application/n-quads",
    });

    const canonizedDidMethodBuffer = Buffer.from(canonizedDidMethod);
    const canonizedDidMethodHash = ethers.utils.sha256(
      canonizedDidMethodBuffer
    );

    const ledgerName = "ebsi-besu";
    const methodSpec = [didMethodBuffer].map((b) => `0x${b.toString("hex")}`);
    const methodSpecHash = [canonizedDidMethodHash];
    const notBefore = 1616408985883;
    const notAfter = 3232818053700;
    const status = 1;

    return {
      methodName,
      ledgerName,
      didMethods: [didMethod],
      didMethodsBuffer: [didMethodBuffer],
      canonizedDidMethods: [canonizedDidMethod],
      canonizedDidMethodsBuffer: [canonizedDidMethodBuffer],
      canonizedDidMethodsHash: [canonizedDidMethodHash],
      methodSpec,
      methodSpecHash,
      notBefore,
      notAfter,
      status,
    };
  };

  let newDidDocument: DidDocumentDataset;
  let updatedDidDocument: DidDocumentDataset;
  const controllers: ethers.Wallet[] = [];
  let didMethod: DidMethodDataset;

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

    const configService = moduleFixture.get<ConfigService<ApiConfig>>(
      ConfigService
    );

    adminTestWallet = new ethers.Wallet(
      prefixWith0x(configService.get("adminTestPrivateKey"))
    );

    newDidDocument = await createDidDocument(controllerDid);
    updatedDidDocument = await createDidDocument(controllerDid);
    didMethod = await createDidMethod();
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  describe.each([
    "insertDidDocument",
    "updateDidDocument",
    "insertDidController",
    "updateDidController",
    "revokeDidController",
    "insertDidMethod",
    "appendDidDocumentVersionHash",
    "detachDidDocumentVersionHash",
    "appendDidDocumentVersionMetadata",
    "detachDidDocumentVersionMetadata",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should work", async () => {
      expect.assertions(5);

      let params: JsonRpcParams = null;
      let signer = adminTestWallet;

      switch (method) {
        case "insertDidDocument": {
          const {
            didDocumentBuffer,
            canonizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = newDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          controllers.push(signer);

          params = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;
          break;
        }
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          params = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as UpdateDidDocumentParam;
          break;
        }
        case "insertDidController": {
          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const controller = ethers.Wallet.createRandom();
          controllers.push(controller);

          params = {
            from: signer.address,
            identifier,
            newControllerId: controller.address,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as InsertDidControllerParam;
          break;
        }
        case "updateDidController": {
          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const controller = controllers[controllers.length - 1];
          // Sign with the new controller
          signer = controller;

          params = {
            from: signer.address,
            identifier,
            newControllerId: controller.address,
            notBefore: 1616408985883,
            notAfter: 3232818053700,
          } as UpdateDidControllerParam;
          break;
        }
        case "revokeDidController": {
          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;

          params = {
            from: signer.address,
            identifier,
            oldControllerId: controllers[controllers.length - 1].address,
          } as RevokeDidControllerParam;
          break;
        }
        case "insertDidMethod": {
          params = {
            from: signer.address,
            methodName: didMethod.methodName,
            ledgerName: didMethod.ledgerName,
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonizedDidMethodsHash,
            notBefore: didMethod.notBefore,
            notAfter: didMethod.notAfter,
            status: didMethod.status,
          } as InsertDidMethodParam;

          break;
        }
        case "updateDidMethod": {
          params = {
            from: signer.address,
            methodName: didMethod.methodName,
            ledgerName: "ebsi-besu-2",
            methodSpec: didMethod.didMethodsBuffer.map(
              (b) => `0x${b.toString("hex")}`
            ),
            methodSpecHash: didMethod.canonizedDidMethodsHash,
            notBefore: didMethod.notBefore,
            notAfter: didMethod.notAfter,
            status: didMethod.status,
          } as UpdateDidMethodParam;

          break;
        }
        case "appendDidDocumentVersionHash": {
          const {
            didDocumentBuffer,
            canonizedDidDocumentHash,
            timestampDataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;

          params = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo,
            timestampData,
          } as AppendDidDocumentVersionHashParam;
          break;
        }
        case "detachDidDocumentVersionHash": {
          const {
            didDocumentBuffer,
            canonizedDidDocumentHash,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;

          params = {
            from: signer.address,
            identifier,
            hashAlgorithmId: 0,
            hashValue: canonizedDidDocumentHash,
            didVersionInfo,
          } as DetachDidDocumentVersionParam;
          break;
        }
        case "appendDidDocumentVersionMetadata":
        case "detachDidDocumentVersionMetadata": {
          const {
            didDocumentBuffer,
            didVersionMetadataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(controllerDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          params = {
            from: signer.address,
            identifier,
            didVersionInfo,
            didVersionMetadata,
          } as AppendDidDocumentVersionMetadataParam;
          break;
        }
        default:
          throw new Error(`Test Error: Invalid method ${method}`);
      }

      const responseBuild: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
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
          from: signer.address,
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
        JSON.parse(JSON.stringify(unsignedTransaction))
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await signer.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .send({
          jsonrpc: "2.0",
          method: "signedTransaction",
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
      const receipt = await waitToBeMined(responseSend.body.result as string);
      expect(receipt.status).toBe("0x1");
    });
  });

  describe("GET /did-methods", () => {
    it("should return a paginated collection of DID methods", async () => {
      expect.assertions(2);

      const response = await request(server).get("/did-methods");

      const total =
        ((response.body as { [x: string]: unknown })?.total as number) ?? 0;

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/did-methods?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([
          {
            name: expect.any(String) as string,
            href: expect.stringContaining("/did-methods/") as string,
          },
        ]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/did-methods?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            `/did-methods?page[after]=${total > 10 ? 2 : 1}&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/did-methods?page[after]=${Math.ceil(total / 10)}&page[size]=10`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get(
        "/did-methods?page[size]=100"
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/did-methods?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/did-methods?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        "/did-methods?page[after]=abc"
      );
      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });
  });

  describe("GET /did-methods/{did}", () => {
    it("should return a specific DID Method", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        `/did-methods/${didMethod.methodName}`
      );

      expect(response.body).toStrictEqual({
        methodName: didMethod.methodName,
        ledgerName: didMethod.ledgerName, // TODO: TBH I was expecting "ebsi-besu-2" here...
        methodSpec: didMethod.didMethodsBuffer.map(
          (b) => `0x${b.toString("hex")}`
        ),
        methodSpecHash: didMethod.canonizedDidMethodsHash,
        notBefore: didMethod.notBefore,
        notAfter: didMethod.notAfter,
        status: didMethod.status,
      } as DidMethodResponseObject);
      expect(response.status).toBe(200);
    });

    it("should throw an error if the DID Method is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get("/did-methods/no-did-method");

      expect(response.body).toStrictEqual({
        title: "DID Method Not Found",
        status: 404,
        detail: "DID Method no-did-method not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /identifiers", () => {
    it("should return a paginated collection of identifiers", async () => {
      expect.assertions(2);

      const response = await request(server).get("/identifiers");

      const total =
        ((response.body as { [x: string]: unknown })?.total as number) ?? 0;

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/identifiers?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([
          {
            did: expect.stringContaining("did:") as string,
            href: expect.stringContaining("/identifiers/") as string,
          },
        ]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/identifiers?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            `/identifiers?page[after]=${total > 10 ? 2 : 1}&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/identifiers?page[after]=${Math.ceil(total / 10)}&page[size]=10`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return an empty array for an unkown controller ID", async () => {
      expect.assertions(2);

      const controllerId = ethers.Wallet.createRandom().address;

      const response = await request(server).get(
        `/identifiers?controller=${controllerId}`
      );
      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers?page[after]=1&page[size]=10&controller=${controllerId}`
        ) as string,
        items: [],
        total: 0,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&controller=${controllerId}`
          ) as string,
          prev: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&controller=${controllerId}`
          ) as string,
          next: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&controller=${controllerId}`
          ) as string,
          last: expect.stringContaining(
            `/identifiers?page[after]=1&page[size]=10&controller=${controllerId}`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get(
        "/identifiers?page[size]=100"
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get("/identifiers?page[size]=0");
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get("/identifiers?page[after]=0");
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        "/identifiers?page[after]=abc"
      );
      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });
  });

  describe("GET /identifiers/{did}", () => {
    it("should return a specific identifier", async () => {
      expect.assertions(3);

      const response = await request(server).get(
        `/identifiers/${updatedDidDocument.controllerDid}`
      );

      expect(response.body).toStrictEqual(updatedDidDocument.didDocument);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/did+ld+json"));
    });

    it("should throw an error if the identifier is not a valid did", async () => {
      expect.assertions(2);

      const response = await request(server).get("/identifiers/invalid");

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["did must be a valid DID"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the identifier is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/identifiers/did:unknown:unknown"
      );

      expect(response.body).toStrictEqual({
        title: "Identifier Not Found",
        status: 404,
        detail: "Identifier did:unknown:unknown not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /identifiers/{did}/versions", () => {
    it("should return a paginated collection of  DID methods", async () => {
      expect.assertions(2);

      const did = updatedDidDocument.controllerDid;

      const response = await request(server).get(
        `/identifiers/${did}/versions`
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers/${did}/versions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([
          {
            versionId: expect.any(String) as string,
            href: expect.stringContaining(
              `/identifiers/${did}/versions/`
            ) as string,
          },
        ]) as Array<string>,
        total: 3,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(8);

      const did = updatedDidDocument.controllerDid;

      const response1 = await request(server).get(
        `/identifiers/${did}/versions?page[size]=2`
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers/${did}/versions?page[after]=1&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 3,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        `/identifiers/${did}/versions?page[after]=2&page[size]=2`
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers/${did}/versions?page[after]=2&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 3,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        `/identifiers/${did}/versions?page[after]=100&page[size]=2`
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers/${did}/versions?page[after]=100&page[size]=2`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 3,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=2`
          ) as string,
          prev: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=2&page[size]=2`
          ) as string,
          next: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=2&page[size]=2`
          ) as string,
          last: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=2&page[size]=2`
          ) as string,
        },
      });
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        `/identifiers/${did}/versions?page[after]=1`
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers/${did}/versions?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: 3,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/identifiers/${did}/versions?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect(response4.status).toBe(200);
    });

    it("should throw an error if the identifier is not a valid did", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/identifiers/invalid/versions"
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["did must be a valid DID"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const did = updatedDidDocument.controllerDid;

      const response1 = await request(server).get(
        `/identifiers/${did}/versions?page[size]=100`
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/identifiers/${did}/versions?page[size]=0`
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        `/identifiers/${did}/versions?page[after]=0`
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        `/identifiers/${did}/versions?page[after]=abc`
      );
      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });
  });

  describe("GET /identifiers/{did}/versions/{versionId}", () => {
    it("should return a specific DID Method", async () => {
      expect.assertions(3);

      const { didDocument, didDocumentBuffer } = updatedDidDocument;
      const did = updatedDidDocument.controllerDid;
      const versionId = ethers.utils.sha256(didDocumentBuffer);

      const response = await request(server).get(
        `/identifiers/${did}/versions/${versionId}`
      );

      expect(response.body).toStrictEqual(didDocument);
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/did+ld+json"));
    });

    it("should throw an error if the identifier is not a valid did", async () => {
      expect.assertions(2);

      const { didDocumentBuffer } = updatedDidDocument;
      const versionId = ethers.utils.sha256(didDocumentBuffer);

      const response = await request(server).get(
        `/identifiers/invalid/versions/${versionId}`
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["did must be a valid DID"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the identifier is not found", async () => {
      expect.assertions(2);

      const { didDocumentBuffer } = updatedDidDocument;
      const versionId = ethers.utils.sha256(didDocumentBuffer);

      const response = await request(server).get(
        `/identifiers/did:unknown:unknown/versions/${versionId}`
      );

      expect(response.body).toStrictEqual({
        title: "Identifier Not Found",
        status: 404,
        detail: "Identifier did:unknown:unknown not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the version ID is not valid", async () => {
      expect.assertions(2);

      const did = updatedDidDocument.controllerDid;
      const versionId = "test";

      const response = await request(server).get(
        `/identifiers/${did}/versions/${versionId}`
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["versionId must match /^0x/ regular expression","versionId must be a hexadecimal number"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });
  });

  describe("GET /did-timestamps", () => {
    it("should return a paginated collection of DID timestamps", async () => {
      expect.assertions(2);

      const response = await request(server).get("/did-timestamps");

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          "/did-timestamps?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([
          {
            timestampId: expect.any(String) as string,
            href: expect.stringContaining(`/did-timestamps/`) as string,
          } as TimestampLink,
        ]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/did-timestamps?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/did-timestamps?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/did-timestamps?page[after]="
          ) as string,
          last: expect.stringContaining(
            "/did-timestamps?page[after]="
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should handle the pagination properly", async () => {
      expect.assertions(8);

      const response1 = await request(server).get(
        "/did-timestamps?page[size]=2"
      );
      expect(response1.body).toStrictEqual({
        self: expect.stringContaining(
          "/did-timestamps?page[after]=1&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/did-timestamps?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/did-timestamps?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/did-timestamps?page[after]="
          ) as string,
          last: expect.stringContaining(
            "/did-timestamps?page[after]="
          ) as string,
        },
      });
      expect(response1.status).toBe(200);

      // next page
      const response2 = await request(server).get(
        "/did-timestamps?page[after]=2&page[size]=2"
      );
      expect(response2.body).toStrictEqual({
        self: expect.stringContaining(
          "/did-timestamps?page[after]=2&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/did-timestamps?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/did-timestamps?page[after]=1&page[size]=2"
          ) as string,
          next: expect.stringContaining(
            "/did-timestamps?page[after]="
          ) as string,
          last: expect.stringContaining(
            "/did-timestamps?page[after]="
          ) as string,
        },
      });
      expect(response2.status).toBe(200);

      // big page
      const response3 = await request(server).get(
        "/did-timestamps?page[after]=100&page[size]=2"
      );
      expect(response3.body).toStrictEqual({
        self: expect.stringContaining(
          "/did-timestamps?page[after]=100&page[size]=2"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 2,
        links: {
          first: expect.stringContaining(
            "/did-timestamps?page[after]=1&page[size]=2"
          ) as string,
          prev: expect.stringContaining(
            "/did-timestamps?page[after]="
          ) as string,
          next: expect.stringContaining(
            "/did-timestamps?page[after]="
          ) as string,
          last: expect.stringContaining(
            "/did-timestamps?page[after]="
          ) as string,
        },
      });
      expect(response3.status).toBe(200);

      // page["after"] defined but page["size"] undefined
      const response4 = await request(server).get(
        "/did-timestamps?page[after]=1"
      );
      expect(response4.body).toStrictEqual({
        self: expect.stringContaining(
          "/did-timestamps?page[after]=1&page[size]=10"
        ) as string,
        items: expect.arrayContaining([]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            "/did-timestamps?page[after]=1&page[size]=10"
          ) as string,
          prev: expect.stringContaining(
            "/did-timestamps?page[after]=1&page[size]=10"
          ) as string,
          next: expect.stringContaining(
            "/did-timestamps?page[after]="
          ) as string,
          last: expect.stringContaining(
            "/did-timestamps?page[after]="
          ) as string,
        },
      });
      expect(response4.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const response1 = await request(server).get(
        "/did-timestamps?page[size]=100"
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        "/did-timestamps?page[size]=0"
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        "/did-timestamps?page[after]=0"
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        "/did-timestamps?page[after]=abc"
      );
      expect(response4.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["page[after] must not be less than 1","page[after] must be a number conforming to the specified constraints"]',
        type: "about:blank",
      });
      expect(response4.status).toBe(400);
    });
  });

  describe("GET /did-timestamps/{did}", () => {
    it("should return a specific DID timestamp", async () => {
      expect.assertions(2);

      const {
        canonizedDidDocumentHash,
        timestampDataBuffer,
      } = updatedDidDocument;

      const timestampId = ethers.utils.sha256(canonizedDidDocumentHash);

      const response = await request(server).get(
        `/did-timestamps/${timestampId}`
      );

      expect(response.body).toStrictEqual({
        blockNumber: expect.any(Number) as number,
        data: `0x${timestampDataBuffer.toString("hex")}`,
        hash: multihashEncode(canonizedDidDocumentHash, "sha2-256"),
        timestampedBy: adminTestWallet.address,
      } as DidTimestampResponseObject);

      expect(response.status).toBe(200);
    });

    it("should throw an error if the timestamp ID is not well formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/did-timestamps/no-timestamp"
      );

      expect(response.body).toStrictEqual({
        detail:
          '["timestampId must match /^0x/ regular expression","timestampId must be a hexadecimal number"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the DID timestamp is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get("/did-timestamps/0x1234");

      expect(response.body).toStrictEqual({
        title: "Timestamp Not Found",
        status: 404,
        detail: "Timestamp 0x1234 not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
