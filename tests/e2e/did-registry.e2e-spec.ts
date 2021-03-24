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
import { prefixWith0x } from "../../src/shared/utils";
import { waitToBeMined } from "../utils/waitToBeMined";
import {
  InsertDidControllerParam,
  InsertDidDocumentParam,
} from "../../src/modules/jsonrpc/dto";

type JsonRpcParams = InsertDidDocumentParam | InsertDidControllerParam;

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

describe("DID Registry (e2e)", () => {
  let app: INestApplication;
  let server: HttpServer;
  let adminTestWallet: ethers.Wallet;

  const createDid = (): string => {
    const buf = crypto.randomBytes(32);
    return `did:ebsi:${bs58.encode(buf)}`;
  };

  const createDidDocument = async (): Promise<DidDocumentDataset> => {
    const did = createDid();
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
          blockchainAccountId:
            "0xab16a96d359ec26a11e2c2b3d8f8b8942d5bfcdb@eip155:1",
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

  let newDidDocument: DidDocumentDataset;

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

    newDidDocument = await createDidDocument();
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  describe.each(["insertDidDocument", "insertDidController"])(
    "/jsonrpc - send transaction for %s",
    (method: string) => {
      it("should work", async () => {
        expect.assertions(5);

        let params: JsonRpcParams = null;

        switch (method) {
          case "insertDidDocument": {
            const {
              controllerDid,
              didDocumentBuffer,
              canonizedDidDocumentHash,
              timestampDataBuffer,
              didVersionMetadataBuffer,
            } = newDidDocument;

            const identifier = `0x${Buffer.from(controllerDid).toString(
              "hex"
            )}`;

            const didVersionInfo = `0x${didDocumentBuffer.toString("hex")}`;
            const timestampData = `0x${timestampDataBuffer.toString("hex")}`;
            const didVersionMetadata = `0x${didVersionMetadataBuffer.toString(
              "hex"
            )}`;

            params = {
              from: adminTestWallet.address,
              identifier,
              hashAlgorithmId: 0,
              hashValue: canonizedDidDocumentHash,
              didVersionInfo,
              timestampData,
              didVersionMetadata,
            } as InsertDidDocumentParam;
            break;
          }
          case "insertDidController": {
            const { controllerDid } = newDidDocument;

            const identifier = `0x${Buffer.from(controllerDid).toString(
              "hex"
            )}`;

            params = {
              from: adminTestWallet.address,
              identifier,
              newControllerId: ethers.Wallet.createRandom().address,
              notBefore: 1616408985883,
              notAfter: 3232818053700,
            } as InsertDidControllerParam;
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
          JSON.parse(JSON.stringify(unsignedTransaction))
        );
        uTx.chainId = Number(uTx.chainId);
        const sgnTx = await adminTestWallet.signTransaction(uTx);
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
    }
  );
});
