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
import canonicalize from "canonicalize";
import { useContainer } from "class-validator";
import { HashName } from "multihashes";
import type { DIDDocument } from "did-resolver";
import { AppModule } from "../../src/app.module";
import { AllExceptionsFilter } from "../../src/filters/http-exception.filter";
import { JsonRpcResponseObject } from "../../src/modules/jsonrpc/jsonrpc.interface";
import { formatEthersUnsignedTransaction } from "../../src/modules/jsonrpc/jsonrpc.utils";
import { ApiConfig } from "../../src/config/configuration";
import { getAccessToken, waitToBeMined } from "../utils/waitToBeMined";
import {
  InsertDidControllerParam,
  InsertDidDocumentParam,
  RevokeDidControllerParam,
  UpdateDidDocumentParam,
  AppendDidDocumentVersionHashParam,
  DetachDidDocumentVersionParam,
  AppendDidDocumentVersionMetadataParam,
  DetachDidDocumentVersionMetadataParam,
  UpdateDidControllerParam,
  UnsignedTransaction,
} from "../../src/modules/jsonrpc/dto";
import {
  DidTimestampResponseObject,
  TimestampLink,
} from "../../src/modules/did-timestamps/did-timestamps.interface";
import { createDid, createDidDocument, createMetadata } from "../utils/data";
import { requestNewUserSiopJwt } from "../utils/siopJwt";
import { describeWriteOps } from "../utils/describeWriteOps";
import { getServer } from "../utils/getServer";

type JsonRpcParams =
  | InsertDidDocumentParam
  | InsertDidControllerParam
  | RevokeDidControllerParam
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
  didDocument: DIDDocument;
  didDocumentBuffer: Buffer;
  canonicalizedDidDocument: string;
  canonicalizedDidDocumentHash: string;
  controllerDid: string;
  timestampDataBuffer: Buffer;
  didVersionMetadata: { [x: string]: unknown };
  didVersionMetadataBuffer: Buffer;
}

const multihashToNodeHashAlg: { [Key in HashName]?: string } = {
  "sha2-256": "sha256",
  "sha2-512": "sha512",
  "sha3-224": "sha3-224",
  "sha3-256": "sha3-256",
  "sha3-384": "sha3-384",
  "sha3-512": "sha3-512",
};

describe("DID Registry (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer | string;
  let configService: ConfigService<ApiConfig, true>;
  let hashAlgorithMultihash: HashName;
  let hashAlgorithOutputLength: number;
  let newUserWallet: ethers.Wallet;
  let newUserAccessToken: string;
  let apiAccessToken: string;
  let ledgerApi: string;
  let lastIdentifier: {
    did: string;
    href: string;
  };
  let lastVersion: {
    versionId: string;
    href: string;
  };
  let lastMetadata: {
    metadataId: string;
    href: string;
  };

  const prepareDidDocument = (
    did: string,
    multihash: HashName,
    outputLength: number
  ): DidDocumentDataset => {
    const didDocument = createDidDocument(did);

    const didDocumentBuffer = Buffer.from(JSON.stringify(didDocument));

    const canonicalizedDidDocument = canonicalize(didDocument);

    const canonicalizedDidDocumentHash = `0x${crypto
      .createHash(multihashToNodeHashAlg[multihash])
      .update(canonicalizedDidDocument, "utf-8")
      .digest()
      .slice(0, outputLength)
      .toString("hex")}`;

    const timestampDataBuffer = Buffer.from(JSON.stringify({ data: "test" }));
    const didVersionMetadata = createMetadata();
    const didVersionMetadataBuffer = Buffer.from(
      JSON.stringify(didVersionMetadata)
    );

    return {
      didDocument,
      didDocumentBuffer,
      canonicalizedDidDocument,
      canonicalizedDidDocumentHash,
      controllerDid: did,
      timestampDataBuffer,
      didVersionMetadata,
      didVersionMetadataBuffer,
    };
  };

  let newUserDid: string;
  let newDidDocument: DidDocumentDataset;
  let updatedDidDocument: DidDocumentDataset;
  const controllers: ethers.Wallet[] = [];
  let hashAlgorithmId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter()
    );

    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Turn off logger
    Logger.overrideLogger(false);

    configService =
      moduleFixture.get<ConfigService<ApiConfig, true>>(ConfigService);

    app.useGlobalFilters(new AllExceptionsFilter(configService));
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await (app.getHttpAdapter().getInstance() as FastifyInstance).ready();

    server = getServer(app, configService);

    // During the tests, we'll use the last hash algorithm
    const getHashAlgorithmsResponse = await request(server).get(
      "/hash-algorithms"
    );
    hashAlgorithmId =
      (getHashAlgorithmsResponse.body as { total: number }).total - 1;

    // Get info about the hash algorithm
    const getHashAlgorithmResponse = await request(server).get(
      `/hash-algorithms/${hashAlgorithmId}`
    );
    hashAlgorithMultihash = (
      getHashAlgorithmResponse.body as { multihash: HashName }
    ).multihash;
    hashAlgorithOutputLength =
      (getHashAlgorithmResponse.body as { outputLengthBits: number })
        .outputLengthBits / 8;

    // Generate test data
    newUserDid = createDid();

    newDidDocument = prepareDidDocument(
      newUserDid,
      hashAlgorithMultihash,
      hashAlgorithOutputLength
    );
    updatedDidDocument = prepareDidDocument(
      newUserDid,
      hashAlgorithMultihash,
      hashAlgorithOutputLength
    );

    const newUserPrivateKey = crypto.randomBytes(32).toString("hex");
    newUserWallet = new ethers.Wallet(`0x${newUserPrivateKey}`);

    const newUserKid = newDidDocument.didDocument.verificationMethod[0].id;

    newUserAccessToken = await requestNewUserSiopJwt({
      clientKid: newUserKid,
      clientPrivateKey: `0x${newUserPrivateKey}`,
      authorisationApiUrl: configService.get<string>("authorisationApiUrl"),
      authorisationCredentialSchema: configService.get<string>(
        "authorisationCredentialSchema"
      ),
      usersOnboardingApiPrivateKey: configService.get<string>(
        "usersOnboardingApiPrivateKey"
      ),
      usersOnboardingApiDid: configService.get<string>("usersOnboardingApiDid"),
      trustedAppsRegistryUrl: configService.get<string>(
        "trustedAppsRegistryApiUrl"
      ),
      ebsiEnv: configService.get<
        "local" | "test" | "conformance" | "pilot" | "prod"
      >("ebsiEnv"),
    });

    apiAccessToken = await getAccessToken(configService);
    ledgerApi = `${configService.get<string>("ledgerApiUrl")}/blockchains/besu`;

    // Get last identifier
    const getAllIdentifiers = await request(server).get("/identifiers");
    const { total } = getAllIdentifiers.body as {
      total: number;
    };
    const getIdentifiersLastPage = await request(server).get(
      `/identifiers?page[after]=${Math.ceil(total / 10)}&page[size]=10`
    );
    const { items: identifiers } = getIdentifiersLastPage.body as {
      items: {
        did: string;
        href: string;
      }[];
    };
    [lastIdentifier] = identifiers.slice(-1);

    // Get last identifier's last version
    const getAllVersions = await request(server).get(
      `/identifiers/${lastIdentifier.did}/versions`
    );
    const { items: versions } = getAllVersions.body as {
      items: {
        versionId: string;
        href: string;
      }[];
    };
    [lastVersion] = versions.slice(-1);

    // Get last identifier's last version's last metadata
    const getAllMetadata = await request(server).get(
      `/identifiers/${lastIdentifier.did}/versions/${lastVersion.versionId}/metadata`
    );
    const { items: metadata } = getAllMetadata.body as {
      items: {
        metadataId: string;
        href: string;
      }[];
    };
    [lastMetadata] = metadata.slice(-1);
  });

  describeWriteOps().each([
    "insertDidDocument",
    "updateDidDocument",
    "insertDidController",
    "updateDidController",
    "revokeDidController",
    "appendDidDocumentVersionHash",
    "detachDidDocumentVersionHash",
    "appendDidDocumentVersionMetadata",
    "detachDidDocumentVersionMetadata",
  ])("/jsonrpc - send transaction for %s", (method: string) => {
    it("should work", async () => {
      expect.assertions(5);

      let params: JsonRpcParams = null;
      let signer = newUserWallet;
      const accessToken = newUserAccessToken;

      switch (method) {
        case "insertDidDocument": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = newDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          controllers.push(signer);

          params = {
            from: signer.address,
            identifier,
            hashAlgorithmId,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as InsertDidDocumentParam;
          break;
        }
        case "updateDidDocument": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
            didVersionMetadataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
          const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
            "hex"
          )}`;

          params = {
            from: signer.address,
            identifier,
            hashAlgorithmId,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            timestampData,
            didVersionMetadata,
          } as UpdateDidDocumentParam;
          break;
        }
        case "insertDidController": {
          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
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
          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
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
          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;

          params = {
            from: signer.address,
            identifier,
            oldControllerId: controllers[controllers.length - 1].address,
          } as RevokeDidControllerParam;
          break;
        }
        case "appendDidDocumentVersionHash": {
          const {
            didDocumentBuffer,
            canonicalizedDidDocumentHash,
            timestampDataBuffer,
          } = updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
          const timestampData = `0x${timestampDataBuffer.toString("hex")}`;

          params = {
            from: signer.address,
            identifier,
            hashAlgorithmId,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
            timestampData,
          } as AppendDidDocumentVersionHashParam;
          break;
        }
        case "detachDidDocumentVersionHash": {
          const { didDocumentBuffer, canonicalizedDidDocumentHash } =
            updatedDidDocument;

          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
          const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;

          params = {
            from: signer.address,
            identifier,
            hashAlgorithmId,
            hashValue: canonicalizedDidDocumentHash,
            didVersionInfo,
          } as DetachDidDocumentVersionParam;
          break;
        }
        case "appendDidDocumentVersionMetadata":
        case "detachDidDocumentVersionMetadata": {
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            updatedDidDocument;
          const identifier = `0x${Buffer.from(newUserDid).toString("hex")}`;
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
        .auth(accessToken, { type: "bearer" })
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
        JSON.parse(
          JSON.stringify(unsignedTransaction)
        ) as unknown as UnsignedTransaction
      );
      uTx.chainId = Number(uTx.chainId);
      const sgnTx = await signer.signTransaction(uTx);
      const { r, s, v } = ethers.utils.parseTransaction(sgnTx);

      const responseSend: SupertestJsonRpcResponse = await request(server)
        .post("/jsonrpc")
        .auth(accessToken, { type: "bearer" })
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
      expect.assertions(4);

      const response = await request(server).get(
        `/identifiers/${lastIdentifier.did}`
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("did:") as string,
          verificationMethod: expect.arrayContaining([
            expect.objectContaining({
              controller: expect.stringContaining("did:") as string,
              id: expect.stringContaining("did:") as string,
              type: expect.any(String) as string,
            }),
          ]) as unknown[],
        })
      );
      expect(
        response.body as { "@context": string | string[] }["@context"]
      ).toBeDefined();
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/did+ld+json"));
    });

    it("should return a specific identifier as 'application/did+json' if 'Accept' header is 'application/did+json'", async () => {
      expect.assertions(3);

      const response = await request(server)
        .get(`/identifiers/${lastIdentifier.did}`)
        .set("Accept", "application/did+json");

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("did:") as string,
          verificationMethod: expect.arrayContaining([
            expect.objectContaining({
              controller: expect.stringContaining("did:") as string,
              id: expect.stringContaining("did:") as string,
              type: expect.any(String) as string,
            }),
          ]) as unknown[],
        })
      );
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/did+json"));
    });

    it("should throw an error if the identifier is not a valid did", async () => {
      expect.assertions(2);

      const response = await request(server).get("/identifiers/invalid");

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["did must be a valid DID v1"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the identifier is not found", async () => {
      expect.assertions(2);

      const randomDid = createDid();
      const response = await request(server).get(`/identifiers/${randomDid}`);

      expect(response.body).toStrictEqual({
        title: "Identifier Not Found",
        status: 404,
        detail: `Identifier ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /identifiers/{did}/versions", () => {
    it("should return a paginated collection of versions", async () => {
      expect.assertions(2);

      const { did } = lastIdentifier;

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
        total: expect.any(Number) as number,
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

    it("should throw an error if the identifier is not a valid did", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/identifiers/invalid/versions"
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["did must be a valid DID v1"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const { did } = lastIdentifier;

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
    it("should return a specific DID document version", async () => {
      expect.assertions(4);

      const { did } = lastIdentifier;
      const { versionId } = lastVersion;

      const response = await request(server).get(
        `/identifiers/${did}/versions/${versionId}`
      );

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("did:") as string,
          verificationMethod: expect.arrayContaining([
            expect.objectContaining({
              controller: expect.stringContaining("did:") as string,
              id: expect.stringContaining("did:") as string,
              type: expect.any(String) as string,
            }),
          ]) as unknown[],
        })
      );
      expect(
        response.body as { "@context": string | string[] }["@context"]
      ).toBeDefined();
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/did+ld+json"));
    });

    it("should return a specific DID document version as 'application/did+json' if 'Accept' header is 'application/did+json'", async () => {
      expect.assertions(4);

      const { did } = lastIdentifier;
      const { versionId } = lastVersion;

      const response = await request(server)
        .get(`/identifiers/${did}/versions/${versionId}`)
        .set("Accept", "application/did+json");

      expect(response.body).toStrictEqual(
        expect.objectContaining({
          id: expect.stringContaining("did:") as string,
          verificationMethod: expect.arrayContaining([
            expect.objectContaining({
              controller: expect.stringContaining("did:") as string,
              id: expect.stringContaining("did:") as string,
              type: expect.any(String) as string,
            }),
          ]) as unknown[],
        })
      );
      expect(
        (response.body as { [x: string]: unknown })["@context"]
      ).toBeUndefined();
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/did+json"));
    });

    it("should throw an error if the identifier is not a valid did", async () => {
      expect.assertions(2);

      const { versionId } = lastVersion;

      const response = await request(server).get(
        `/identifiers/invalid/versions/${versionId}`
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["did must be a valid DID v1"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the identifier is not found", async () => {
      expect.assertions(2);

      const { versionId } = lastVersion;
      const randomDid = createDid();

      const response = await request(server).get(
        `/identifiers/${randomDid}/versions/${versionId}`
      );

      expect(response.body).toStrictEqual({
        title: "Identifier Not Found",
        status: 404,
        detail: `Identifier ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the version ID is not valid", async () => {
      expect.assertions(2);

      const { did } = lastIdentifier;
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

  describe("GET /identifiers/{did}/versions/{versionId}/metadata", () => {
    it("should return a paginated collection of DID Document metadata", async () => {
      expect.assertions(2);

      const { did } = lastIdentifier;
      const { versionId } = lastVersion;

      const response = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=10`
        ) as string,
        items: expect.arrayContaining([
          {
            metadataId: expect.any(String) as string,
            href: expect.stringContaining(
              `/identifiers/${did}/versions/${versionId}/metadata/`
            ) as string,
          },
        ]) as Array<string>,
        total: expect.any(Number) as number,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          prev: expect.stringContaining(
            `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          next: expect.stringContaining(
            `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
          last: expect.stringContaining(
            `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=10`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should throw a Bad Request for bad pagination", async () => {
      expect.assertions(8);

      const { did } = lastIdentifier;
      const { versionId } = lastVersion;

      const response1 = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata?page[size]=100`
      );
      expect(response1.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be greater than 50"]',
        type: "about:blank",
      });
      expect(response1.status).toBe(400);

      const response2 = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata?page[size]=0`
      );
      expect(response2.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[size] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response2.status).toBe(400);

      const response3 = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata?page[after]=0`
      );
      expect(response3.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["page[after] must not be less than 1"]',
        type: "about:blank",
      });
      expect(response3.status).toBe(400);

      const response4 = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata?page[after]=abc`
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

    it("should throw an error if the identifier is not a valid DID", async () => {
      expect.assertions(2);

      const { versionId } = lastVersion;

      const response = await request(server).get(
        `/identifiers/invalid/versions/${versionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["did must be a valid DID v1"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the identifier is not found", async () => {
      expect.assertions(2);

      const { versionId } = lastVersion;
      const randomDid = createDid();

      const response = await request(server).get(
        `/identifiers/${randomDid}/versions/${versionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        title: "Identifier Not Found",
        status: 404,
        detail: `Identifier ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the version ID is not valid", async () => {
      expect.assertions(2);

      const { did } = lastIdentifier;
      const versionId = "test";

      const response = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata`
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

    it("should throw an error if the version ID is not found", async () => {
      expect.assertions(2);

      const { did } = lastIdentifier;
      const versionId = ethers.utils.sha256(crypto.randomBytes(32));

      const response = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata`
      );

      expect(response.body).toStrictEqual({
        title: "Version Not Found",
        status: 404,
        detail: `Version ${versionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });

  describe("GET /identifiers/{did}/versions/{versionId}/metadata/{metadataId}", () => {
    it("should return a specific DID Document metadata", async () => {
      expect.assertions(3);

      const { did } = lastIdentifier;
      const { versionId } = lastVersion;
      const { metadataId } = lastMetadata;

      const response = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual(expect.objectContaining({}));
      expect(response.status).toBe(200);
      expect(
        (response.headers as { "content-type": string })["content-type"]
      ).toStrictEqual(expect.stringContaining("application/json"));
    });

    it("should throw an error if the identifier is not a valid did", async () => {
      expect.assertions(2);

      const { versionId } = lastVersion;
      const { metadataId } = lastMetadata;

      const response = await request(server).get(
        `/identifiers/invalid/versions/${versionId}/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail: '["did must be a valid DID v1"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the identifier is not found", async () => {
      expect.assertions(2);

      const { versionId } = lastVersion;
      const { metadataId } = lastMetadata;
      const randomDid = createDid();

      const response = await request(server).get(
        `/identifiers/${randomDid}/versions/${versionId}/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual({
        title: "Identifier Not Found",
        status: 404,
        detail: `Identifier ${randomDid} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the version ID is not valid", async () => {
      expect.assertions(2);

      const { did } = lastIdentifier;
      const versionId = "test";
      const { metadataId } = lastMetadata;

      const response = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata/${metadataId}`
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

    it("should throw an error if the version ID is not found", async () => {
      expect.assertions(2);

      const { did } = lastIdentifier;
      const versionId = ethers.utils.sha256(crypto.randomBytes(32));
      const { metadataId } = lastMetadata;

      const response = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual({
        title: "Version Not Found",
        status: 404,
        detail: `Version ${versionId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });

    it("should throw an error if the metadata ID is not valid", async () => {
      expect.assertions(2);

      const { did } = lastIdentifier;
      const { versionId } = lastVersion;
      const metadataId = "test";

      const response = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual({
        title: "Bad Request",
        status: 400,
        detail:
          '["metadataId must match /^0x/ regular expression","metadataId must be a hexadecimal number"]',
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the metadata ID is not found", async () => {
      expect.assertions(2);

      const { did } = lastIdentifier;
      const { versionId } = lastVersion;
      const metadataId = "0x1234";

      const response = await request(server).get(
        `/identifiers/${did}/versions/${versionId}/metadata/${metadataId}`
      );

      expect(response.body).toStrictEqual({
        title: "Metadata Not Found",
        status: 404,
        detail: `Metadata ${metadataId} not found`,
        type: "about:blank",
      });
      expect(response.status).toBe(404);
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

    it("should return an empty collection if the identifier and version ID don't match any record", async () => {
      expect.assertions(2);

      const did = createDid();
      const versionId = 1;

      const response = await request(server).get(
        `/did-timestamps?identifier=${did}&version-id=${versionId}`
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/did-timestamps?page[after]=1&page[size]=10&identifier=${did}&version-id=${versionId}`
        ) as string,
        items: [],
        total: 0,
        pageSize: 10,
        links: {
          first: expect.stringContaining(
            `/did-timestamps?page[after]=1&page[size]=10&identifier=${did}&version-id=${versionId}`
          ) as string,
          prev: expect.stringContaining(
            `/did-timestamps?page[after]=1&page[size]=10&identifier=${did}&version-id=${versionId}`
          ) as string,
          next: expect.stringContaining(
            `/did-timestamps?page[after]=1&page[size]=10&identifier=${did}&version-id=${versionId}`
          ) as string,
          last: expect.stringContaining(
            `/did-timestamps?page[after]=1&page[size]=10&identifier=${did}&version-id=${versionId}`
          ) as string,
        },
      });
      expect(response.status).toBe(200);
    });

    it("should return a paginated collection of DID timestamps filtered by identifier and version ID", async () => {
      expect.assertions(2);

      const { did } = lastIdentifier;
      const versionId = 1;

      const response = await request(server).get(
        `/did-timestamps?identifier=${did}&version-id=${versionId}`
      );

      expect(response.body).toStrictEqual({
        self: expect.stringContaining(
          `/did-timestamps?page[after]=1&page[size]=10&identifier=${did}&version-id=${versionId}`
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
            `/did-timestamps?page[after]=1&page[size]=10&identifier=${did}&version-id=${versionId}`
          ) as string,
          prev: expect.stringContaining(
            `/did-timestamps?page[after]=1&page[size]=10&identifier=${did}&version-id=${versionId}`
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
  });

  describe("GET /did-timestamps/{did}", () => {
    it("should return a specific DID timestamp", async () => {
      expect.assertions(2);

      const getAllTimestamps = await request(server).get("/did-timestamps");
      const { total } = getAllTimestamps.body as {
        total: number;
      };
      const getTimestampsLastPage = await request(server).get(
        `/did-timestamps?page[after]=${Math.ceil(total / 10)}&page[size]=10`
      );
      const { items: timestamps } = getTimestampsLastPage.body as {
        items: {
          timestampId: string;
          href: string;
        }[];
      };
      const lastTimestamp = timestamps.pop();

      const response = await request(server).get(
        `/did-timestamps/${lastTimestamp.timestampId}`
      );

      expect(response.body).toStrictEqual({
        blockNumber: expect.any(Number) as number,
        data: expect.stringContaining("0x") as string,
        hash: expect.any(String) as string,
        timestampedBy: expect.stringContaining("0x") as string,
      } as DidTimestampResponseObject);

      expect(response.status).toBe(200);
    });

    it("should throw an error if the timestamp ID is not well formatted", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/did-timestamps/no-timestamp"
      );

      expect(response.body).toStrictEqual({
        detail: '["timestampId must be multi-base64url encoded"]',
        status: 400,
        title: "Bad Request",
        type: "about:blank",
      });
      expect(response.status).toBe(400);
    });

    it("should throw an error if the DID timestamp is not found", async () => {
      expect.assertions(2);

      const response = await request(server).get(
        "/did-timestamps/uMHg3ZWNlZGNiNGRjMTMyYzUzM2IxMmViNjM1MTlhZmQ4N2JlYmNhYmZjNDk0NWQwNjA1ODFjNjZjYWNiYjBjN2Q4"
      );

      expect(response.body).toStrictEqual({
        title: "Timestamp Not Found",
        status: 404,
        detail:
          "Timestamp uMHg3ZWNlZGNiNGRjMTMyYzUzM2IxMmViNjM1MTlhZmQ4N2JlYmNhYmZjNDk0NWQwNjA1ODFjNjZjYWNiYjBjN2Q4 not found",
        type: "about:blank",
      });
      expect(response.status).toBe(404);
    });
  });
});
