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
import { FastifyInstance } from "fastify";
import { ethers } from "ethers";
import { DidTimestampsModule } from "./did-timestamps.module";
import {
  DidTimestampResponseObject,
  TimestampLink,
} from "./did-timestamps.interface";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { DidRegistry__factory } from "../../contracts/did-registry";
import { setupTestEnv } from "../../../tests/utils/didRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { multihashEncode } from "../../shared/utils";
import { LedgerService } from "../ledger/ledger.service";

jest.setTimeout(120000);

const DID_METHODS_TOTAL = 3;

describe("DidTimestamps Module", () => {
  describe.each(["lowercase", "mixed case"])(
    "(with %s DIDs)",
    (lettercase: string) => {
      let app: INestApplication;
      let server: HttpServer;
      let testEnv: AsyncReturnType<typeof setupTestEnv>;
      let ledgerService: LedgerService;

      beforeAll(async () => {
        // Spin up test blockchain (hardhat)
        testEnv = await setupTestEnv({
          didDocuments: DID_METHODS_TOTAL,
          lowercaseDid: lettercase === "lowercase",
        });
        const { didRegistryContract } = testEnv;

        // Mock TSR contract
        jest
          .spyOn(DidRegistry__factory, "connect")
          .mockImplementation(() => didRegistryContract);

        const moduleFixture: TestingModule = await Test.createTestingModule({
          imports: [DidTimestampsModule],
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

        // Mock Contract service
        ledgerService = moduleFixture.get<LedgerService>(LedgerService);
        jest
          .spyOn(ledgerService, "getContract")
          .mockImplementation(async () => Promise.resolve(didRegistryContract));
      });

      afterAll(async () => {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
        await app.close();
      });

      describe("GET /did-timestamps", () => {
        it("should return a paginated collection of DID timestamps", async () => {
          expect.assertions(3);

          const { didDocuments } = testEnv;

          const response = await request(server).get("/did-timestamps");

          expect(response.body).toStrictEqual({
            self: expect.stringContaining(
              "/did-timestamps?page[after]=1&page[size]=10"
            ) as string,
            items: expect.arrayContaining(
              didDocuments.map((method) => {
                // Timestamp ID = sha256(canonicalizedDidDocumentHash)
                const hash = ethers.utils.sha256(
                  method.canonicalizedDidDocumentHash
                );
                return {
                  timestampId: hash,
                  href: expect.stringContaining(
                    `/did-timestamps/${hash}`
                  ) as string,
                } as TimestampLink;
              })
            ) as Array<string>,
            total: DID_METHODS_TOTAL,
            pageSize: 10,
            links: {
              first: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=10"
              ) as string,
              prev: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=10"
              ) as string,
              next: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=10"
              ) as string,
              last: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=10"
              ) as string,
            },
          });
          expect((response.body as { items: string }).items).toHaveLength(
            DID_METHODS_TOTAL
          );
          expect(response.status).toBe(200);
        });

        it("should handle the pagination properly", async () => {
          expect.assertions(12);

          const response1 = await request(server).get(
            "/did-timestamps?page[size]=2"
          );
          expect(response1.body).toStrictEqual({
            self: expect.stringContaining(
              "/did-timestamps?page[after]=1&page[size]=2"
            ) as string,
            items: expect.arrayContaining([]) as Array<string>,
            total: DID_METHODS_TOTAL,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=2"
              ) as string,
              prev: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=2"
              ) as string,
              next: expect.stringContaining(
                "/did-timestamps?page[after]=2&page[size]=2"
              ) as string,
              last: expect.stringContaining(
                "/did-timestamps?page[after]=2&page[size]=2"
              ) as string,
            },
          });
          expect((response1.body as { items: string }).items).toHaveLength(2);
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
            total: DID_METHODS_TOTAL,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=2"
              ) as string,
              prev: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=2"
              ) as string,
              next: expect.stringContaining(
                "/did-timestamps?page[after]=2&page[size]=2"
              ) as string,
              last: expect.stringContaining(
                "/did-timestamps?page[after]=2&page[size]=2"
              ) as string,
            },
          });
          expect((response2.body as { items: string }).items).toHaveLength(1);
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
            total: DID_METHODS_TOTAL,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=2"
              ) as string,
              prev: expect.stringContaining(
                "/did-timestamps?page[after]=2&page[size]=2"
              ) as string,
              next: expect.stringContaining(
                "/did-timestamps?page[after]=2&page[size]=2"
              ) as string,
              last: expect.stringContaining(
                "/did-timestamps?page[after]=2&page[size]=2"
              ) as string,
            },
          });
          expect((response3.body as { items: string }).items).toHaveLength(0);
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
            total: DID_METHODS_TOTAL,
            pageSize: 10,
            links: {
              first: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=10"
              ) as string,
              prev: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=10"
              ) as string,
              next: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=10"
              ) as string,
              last: expect.stringContaining(
                "/did-timestamps?page[after]=1&page[size]=10"
              ) as string,
            },
          });
          expect((response4.body as { items: string }).items).toHaveLength(3);
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

        it("should throw a Bad Request for bad parameters", async () => {
          expect.assertions(8);

          const response1 = await request(server).get(
            "/did-timestamps?identifier=abc"
          );
          expect(response1.body).toStrictEqual({
            title: "Bad Request",
            status: 400,
            detail: '["identifier must be a valid DID"]',
            type: "about:blank",
          });
          expect(response1.status).toBe(400);

          const response2 = await request(server).get(
            "/did-timestamps?version-id=string"
          );
          expect(response2.body).toStrictEqual({
            title: "Bad Request",
            status: 400,
            detail:
              '["version-id must be a number conforming to the specified constraints"]',
            type: "about:blank",
          });
          expect(response2.status).toBe(400);

          const response3 = await request(server).get(
            "/did-timestamps?identifier=did:unknown:1234"
          );
          expect(response3.body).toStrictEqual({
            title: "Bad Request",
            status: 400,
            detail:
              "Invalid parameters: make sure to define both 'identifier' and 'version-id'",
            type: "about:blank",
          });
          expect(response3.status).toBe(400);

          const response4 = await request(server).get(
            "/did-timestamps?version-id=1"
          );
          expect(response4.body).toStrictEqual({
            title: "Bad Request",
            status: 400,
            detail:
              "Invalid parameters: make sure to define both 'identifier' and 'version-id'",
            type: "about:blank",
          });
          expect(response4.status).toBe(400);
        });

        it("should return an empty list when the filters don't match any record", async () => {
          expect.assertions(2);

          const did = "did:unknown:1234";
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
          expect.assertions(3);

          const { didDocuments } = testEnv;

          const { did } = didDocuments[0];
          const versionId = 1;

          const response = await request(server).get(
            `/did-timestamps?identifier=${did}&version-id=${versionId}`
          );

          expect(response.body).toStrictEqual({
            self: expect.stringContaining(
              `/did-timestamps?page[after]=1&page[size]=10&identifier=${did}&version-id=${versionId}`
            ) as string,
            items: expect.arrayContaining(
              [didDocuments[0]].map((method) => {
                // Timestamp ID = sha256(canonicalizedDidDocumentHash)
                const hash = ethers.utils.sha256(
                  method.canonicalizedDidDocumentHash
                );
                return {
                  timestampId: hash,
                  href: expect.stringContaining(
                    `/did-timestamps/${hash}`
                  ) as string,
                } as TimestampLink;
              })
            ) as Array<string>,
            total: 1,
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
          expect((response.body as { items: string }).items).toHaveLength(1);
          expect(response.status).toBe(200);
        });
      });

      describe("GET /did-timestamps/{did}", () => {
        it("should return a specific DID timestamp", async () => {
          expect.assertions(2);

          const { didDocuments, didRegistryContract } = testEnv;
          const { canonicalizedDidDocumentHash, timestampDataBuffer } =
            didDocuments[0];

          const timestampId = ethers.utils.sha256(canonicalizedDidDocumentHash);

          const response = await request(server).get(
            `/did-timestamps/${timestampId}`
          );

          const signer = await didRegistryContract.signer.getAddress();

          expect(response.body).toStrictEqual({
            blockNumber: expect.any(Number) as number,
            data: `0x${timestampDataBuffer.toString("hex")}`,
            hash: multihashEncode(
              canonicalizedDidDocumentHash,
              testEnv.hashAlgorithms[0].multihash,
              testEnv.hashAlgorithms[0].outputLength / 8
            ),
            timestampedBy: signer,
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
    }
  );
});
