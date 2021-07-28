import crypto from "crypto";
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
import { FastifyInstance } from "fastify";
import { ethers } from "ethers";
import { IdentifiersModule } from "./identifiers.module";
import { AllExceptionsFilter } from "../../filters/http-exception.filter";
import { DidRegistry__factory } from "../../contracts/did-registry";
import { setupTestEnv } from "../../../tests/utils/didRegistry";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { LedgerService } from "../ledger/ledger.service";

jest.setTimeout(120000);

const DID_DOCUMENTS = 3;

describe("Identifiers Module", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
          didDocuments: DID_DOCUMENTS,
          lowercaseDid: lettercase === "lowercase",
        });
        const { didRegistryContract } = testEnv;

        // Mock TSR contract
        jest
          .spyOn(DidRegistry__factory, "connect")
          .mockImplementation(() => didRegistryContract);

        const moduleFixture: TestingModule = await Test.createTestingModule({
          imports: [IdentifiersModule],
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

      describe("GET /identifiers", () => {
        it("should return a paginated collection of DID Documents", async () => {
          expect.assertions(3);

          const { didDocuments } = testEnv;

          const response = await request(server).get("/identifiers");
          expect(response.body).toStrictEqual({
            self: expect.stringContaining(
              "/identifiers?page[after]=1&page[size]=10"
            ) as string,
            items: expect.arrayContaining(
              didDocuments.map((doc) => ({
                did: doc.did,
                href: expect.stringContaining(
                  `/identifiers/${doc.did}`
                ) as string,
              }))
            ) as Array<string>,
            total: DID_DOCUMENTS,
            pageSize: 10,
            links: {
              first: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=10"
              ) as string,
              prev: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=10"
              ) as string,
              next: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=10"
              ) as string,
              last: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=10"
              ) as string,
            },
          });
          expect((response.body as { items: string }).items).toHaveLength(
            DID_DOCUMENTS
          );
          expect(response.status).toBe(200);
        });

        it("should filter the results by controller ID", async () => {
          expect.assertions(2);

          const { didDocuments } = testEnv;

          const controllerId = didDocuments[0].controller.address;

          const response = await request(server).get(
            `/identifiers?controller=${controllerId}`
          );
          expect(response.body).toStrictEqual({
            self: expect.stringContaining(
              `/identifiers?page[after]=1&page[size]=10&controller=${controllerId}`
            ) as string,
            items: expect.arrayContaining([
              {
                did: didDocuments[0].did,
                href: expect.stringContaining(
                  `/identifiers/${didDocuments[0].did}`
                ) as string,
              },
            ]) as Array<unknown>,
            total: 1,
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

        it("should handle the pagination properly", async () => {
          expect.assertions(12);

          const response1 = await request(server).get(
            "/identifiers?page[size]=2"
          );
          expect(response1.body).toStrictEqual({
            self: expect.stringContaining(
              "/identifiers?page[after]=1&page[size]=2"
            ) as string,
            items: expect.arrayContaining([]) as Array<string>,
            total: DID_DOCUMENTS,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=2"
              ) as string,
              prev: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=2"
              ) as string,
              next: expect.stringContaining(
                "/identifiers?page[after]=2&page[size]=2"
              ) as string,
              last: expect.stringContaining(
                "/identifiers?page[after]=2&page[size]=2"
              ) as string,
            },
          });
          expect((response1.body as { items: string }).items).toHaveLength(2);
          expect(response1.status).toBe(200);

          // next page
          const response2 = await request(server).get(
            "/identifiers?page[after]=2&page[size]=2"
          );
          expect(response2.body).toStrictEqual({
            self: expect.stringContaining(
              "/identifiers?page[after]=2&page[size]=2"
            ) as string,
            items: expect.arrayContaining([]) as Array<string>,
            total: DID_DOCUMENTS,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=2"
              ) as string,
              prev: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=2"
              ) as string,
              next: expect.stringContaining(
                "/identifiers?page[after]=2&page[size]=2"
              ) as string,
              last: expect.stringContaining(
                "/identifiers?page[after]=2&page[size]=2"
              ) as string,
            },
          });
          expect((response2.body as { items: string }).items).toHaveLength(1);
          expect(response2.status).toBe(200);

          // big page
          const response3 = await request(server).get(
            "/identifiers?page[after]=100&page[size]=2"
          );
          expect(response3.body).toStrictEqual({
            self: expect.stringContaining(
              "/identifiers?page[after]=100&page[size]=2"
            ) as string,
            items: expect.arrayContaining([]) as Array<string>,
            total: DID_DOCUMENTS,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=2"
              ) as string,
              prev: expect.stringContaining(
                "/identifiers?page[after]=2&page[size]=2"
              ) as string,
              next: expect.stringContaining(
                "/identifiers?page[after]=2&page[size]=2"
              ) as string,
              last: expect.stringContaining(
                "/identifiers?page[after]=2&page[size]=2"
              ) as string,
            },
          });
          expect((response3.body as { items: string }).items).toHaveLength(0);
          expect(response3.status).toBe(200);

          // page["after"] defined but page["size"] undefined
          const response4 = await request(server).get(
            "/identifiers?page[after]=1"
          );
          expect(response4.body).toStrictEqual({
            self: expect.stringContaining(
              "/identifiers?page[after]=1&page[size]=10"
            ) as string,
            items: expect.arrayContaining([]) as Array<string>,
            total: DID_DOCUMENTS,
            pageSize: 10,
            links: {
              first: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=10"
              ) as string,
              prev: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=10"
              ) as string,
              next: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=10"
              ) as string,
              last: expect.stringContaining(
                "/identifiers?page[after]=1&page[size]=10"
              ) as string,
            },
          });
          expect((response4.body as { items: string }).items).toHaveLength(3);
          expect(response4.status).toBe(200);
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

          const response2 = await request(server).get(
            "/identifiers?page[size]=0"
          );
          expect(response2.body).toStrictEqual({
            title: "Bad Request",
            status: 400,
            detail: '["page[size] must not be less than 1"]',
            type: "about:blank",
          });
          expect(response2.status).toBe(400);

          const response3 = await request(server).get(
            "/identifiers?page[after]=0"
          );
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
        it("should return a specific DID Document", async () => {
          expect.assertions(3);

          const { didDocuments } = testEnv;
          const { did, didDocument } = didDocuments[0];

          const response = await request(server).get(`/identifiers/${did}`);

          expect(response.body).toStrictEqual(didDocument);
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
        it("should return a paginated collection of DID Document versions", async () => {
          expect.assertions(2);

          const { didDocuments } = testEnv;
          const { did } = didDocuments[0];

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
            total: 1,
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

          const { didDocuments } = testEnv;
          const { did } = didDocuments[0];

          const response1 = await request(server).get(
            `/identifiers/${did}/versions?page[size]=2`
          );
          expect(response1.body).toStrictEqual({
            self: expect.stringContaining(
              `/identifiers/${did}/versions?page[after]=1&page[size]=2`
            ) as string,
            items: expect.arrayContaining([]) as Array<string>,
            total: 1,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
              ) as string,
              prev: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
              ) as string,
              next: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
              ) as string,
              last: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
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
            total: 1,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
              ) as string,
              prev: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
              ) as string,
              next: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
              ) as string,
              last: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
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
            total: 1,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
              ) as string,
              prev: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
              ) as string,
              next: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
              ) as string,
              last: expect.stringContaining(
                `/identifiers/${did}/versions?page[after]=1&page[size]=2`
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
            total: 1,
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

          const { didDocuments } = testEnv;
          const { did } = didDocuments[0];

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
        it("should return a specific DID Document version", async () => {
          expect.assertions(3);

          const { didDocuments } = testEnv;
          const { did, didDocument, didDocumentBuffer } = didDocuments[0];
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

          const { didDocuments } = testEnv;
          const { didDocumentBuffer } = didDocuments[0];
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

          const { didDocuments } = testEnv;
          const { didDocumentBuffer } = didDocuments[0];
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

          const { didDocuments } = testEnv;
          const { did } = didDocuments[0];
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

          const { didDocuments } = testEnv;
          const { did, didDocumentBuffer } = didDocuments[0];
          const versionId = ethers.utils.sha256(didDocumentBuffer);

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
            total: 1,
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

        it("should handle the pagination properly", async () => {
          expect.assertions(8);

          const { didDocuments } = testEnv;
          const { did, didDocumentBuffer } = didDocuments[0];
          const versionId = ethers.utils.sha256(didDocumentBuffer);

          const response1 = await request(server).get(
            `/identifiers/${did}/versions/${versionId}/metadata?page[size]=2`
          );

          expect(response1.body).toStrictEqual({
            self: expect.stringContaining(
              `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
            ) as string,
            items: expect.arrayContaining([]) as Array<string>,
            total: 1,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
              prev: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
              next: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
              last: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
            },
          });
          expect(response1.status).toBe(200);

          // next page
          const response2 = await request(server).get(
            `/identifiers/${did}/versions/${versionId}/metadata?page[after]=2&page[size]=2`
          );
          expect(response2.body).toStrictEqual({
            self: expect.stringContaining(
              `/identifiers/${did}/versions/${versionId}/metadata?page[after]=2&page[size]=2`
            ) as string,
            items: expect.arrayContaining([]) as Array<string>,
            total: 1,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
              prev: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
              next: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
              last: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
            },
          });
          expect(response2.status).toBe(200);

          // big page
          const response3 = await request(server).get(
            `/identifiers/${did}/versions/${versionId}/metadata?page[after]=100&page[size]=2`
          );
          expect(response3.body).toStrictEqual({
            self: expect.stringContaining(
              `/identifiers/${did}/versions/${versionId}/metadata?page[after]=100&page[size]=2`
            ) as string,
            items: expect.arrayContaining([]) as Array<string>,
            total: 1,
            pageSize: 2,
            links: {
              first: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
              prev: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
              next: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
              last: expect.stringContaining(
                `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=2`
              ) as string,
            },
          });
          expect(response3.status).toBe(200);

          // page["after"] defined but page["size"] undefined
          const response4 = await request(server).get(
            `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1`
          );
          expect(response4.body).toStrictEqual({
            self: expect.stringContaining(
              `/identifiers/${did}/versions/${versionId}/metadata?page[after]=1&page[size]=10`
            ) as string,
            items: expect.arrayContaining([]) as Array<string>,
            total: 1,
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
          expect(response4.status).toBe(200);
        });

        it("should throw a Bad Request for bad pagination", async () => {
          expect.assertions(8);

          const { didDocuments } = testEnv;
          const { did, didDocumentBuffer } = didDocuments[0];
          const versionId = ethers.utils.sha256(didDocumentBuffer);

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

        it("should throw an error if the identifier is not a valid did", async () => {
          expect.assertions(2);

          const { didDocuments } = testEnv;
          const { didDocumentBuffer } = didDocuments[0];
          const versionId = ethers.utils.sha256(didDocumentBuffer);

          const response = await request(server).get(
            `/identifiers/invalid/versions/${versionId}/metadata`
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

          const { didDocuments } = testEnv;
          const { didDocumentBuffer } = didDocuments[0];
          const versionId = ethers.utils.sha256(didDocumentBuffer);

          const response = await request(server).get(
            `/identifiers/did:unknown:unknown/versions/${versionId}/metadata`
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

          const { didDocuments } = testEnv;
          const { did } = didDocuments[0];
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

          const { didDocuments } = testEnv;
          const { did } = didDocuments[0];
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

          const { didDocuments } = testEnv;
          const {
            did,
            didDocumentBuffer,
            didVersionMetadata,
            didVersionMetadataBuffer,
          } = didDocuments[0];
          const versionId = ethers.utils.sha256(didDocumentBuffer);
          const metadataId = ethers.utils.sha256(didVersionMetadataBuffer);

          const response = await request(server).get(
            `/identifiers/${did}/versions/${versionId}/metadata/${metadataId}`
          );

          expect(response.body).toStrictEqual(didVersionMetadata);

          expect(response.status).toBe(200);
          expect(
            (response.headers as { "content-type": string })["content-type"]
          ).toStrictEqual(expect.stringContaining("application/json"));
        });

        it("should throw an error if the identifier is not a valid did", async () => {
          expect.assertions(2);

          const { didDocuments } = testEnv;
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            didDocuments[0];
          const versionId = ethers.utils.sha256(didDocumentBuffer);
          const metadataId = ethers.utils.sha256(didVersionMetadataBuffer);

          const response = await request(server).get(
            `/identifiers/invalid/versions/${versionId}/metadata/${metadataId}`
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

          const { didDocuments } = testEnv;
          const { didDocumentBuffer, didVersionMetadataBuffer } =
            didDocuments[0];
          const versionId = ethers.utils.sha256(didDocumentBuffer);
          const metadataId = ethers.utils.sha256(didVersionMetadataBuffer);

          const response = await request(server).get(
            `/identifiers/did:unknown:unknown/versions/${versionId}/metadata/${metadataId}`
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

          const { didDocuments } = testEnv;
          const { did, didVersionMetadataBuffer } = didDocuments[0];
          const versionId = "test";
          const metadataId = ethers.utils.sha256(didVersionMetadataBuffer);

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

          const { didDocuments } = testEnv;
          const { did, didVersionMetadataBuffer } = didDocuments[0];
          const versionId = ethers.utils.sha256(crypto.randomBytes(32));
          const metadataId = ethers.utils.sha256(didVersionMetadataBuffer);

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

          const { didDocuments } = testEnv;
          const { did, didDocumentBuffer } = didDocuments[0];
          const versionId = ethers.utils.sha256(didDocumentBuffer);
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

          const { didDocuments } = testEnv;
          const { did, didDocumentBuffer } = didDocuments[0];
          const versionId = ethers.utils.sha256(didDocumentBuffer);
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
    }
  );
});
