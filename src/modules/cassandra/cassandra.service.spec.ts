import { Test } from "@nestjs/testing";
import cassandra from "cassandra-driver";
import { ApiConfigModule } from "../../config/configuration";
import { CassandraService } from "./cassandra.service";

const fakeQueryResult = {
  info: {
    queriedHost: "::1:9042",
    triedHosts: { "::1:9042": null },
    speculativeExecutions: 0,
    achievedConsistency: 10,
    traceId: undefined,
    warnings: undefined,
    customPayload: undefined,
    isSchemaInAgreement: true,
  },
  rows: [
    {
      get: jest.fn(),
      id: "03ea09bf577a94157b493b337bf9c356e69a0eaa5427274d971ad7d31fb5aefa",
      message: "json string",
      receiver: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
      sender: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    },
    {
      get: jest.fn(),
      id: "d2f349deeae0eee3a5f674d0edd4a88c38896df69e27ab2d7827ca5d66f43088",
      message: "json string",
      receiver: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
      sender: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    },
  ],
  rowLength: 2,
  columns: [
    { name: "id", type: [Object] },
    { name: "message", type: [Object] },
    { name: "receiver", type: [Object] },
    { name: "sender", type: [Object] },
  ],
  pageState: null,
  nextPage: undefined,
  nextPageAsync: undefined,
};

const fakeEmptyQueryResult = {
  info: {
    queriedHost: "::1:9042",
    triedHosts: { "::1:9042": null },
    speculativeExecutions: 0,
    achievedConsistency: 10,
    traceId: undefined,
    warnings: undefined,
    customPayload: undefined,
    isSchemaInAgreement: true,
  },
  rows: [],
  rowLength: 0,
  columns: [
    { name: "id", type: [Object] },
    { name: "message", type: [Object] },
    { name: "receiver", type: [Object] },
    { name: "sender", type: [Object] },
  ],
  pageState: null,
  nextPage: undefined,
  nextPageAsync: undefined,
};

describe("Cassandra service", () => {
  describe("GET /notifications", () => {
    let cassandraService: CassandraService;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [CassandraService],
        imports: [ApiConfigModule],
      }).compile();
      cassandraService = moduleRef.get<CassandraService>(CassandraService);
    });

    it("should return an empty list of stored notifications", async () => {
      expect.assertions(3);
      jest.mock("cassandra-driver");
      const mockExecute = jest.spyOn(cassandra.Client.prototype, "execute");
      mockExecute.mockImplementation(() => {
        return fakeEmptyQueryResult;
      });
      const result = await cassandraService.getNotifications(
        fakeQueryResult.rows[0].receiver
      );
      expect(result).toHaveLength(0);
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(
        mockExecute
      ).toHaveBeenCalledWith(
        "select * from notification_storage where receiver = ? allow filtering",
        [fakeQueryResult.rows[0].receiver]
      );
      jest.resetAllMocks();
    });

    it("should return a list of stored notifications", async () => {
      expect.assertions(9);
      jest.mock("cassandra-driver");
      const mockExecute = jest.spyOn(cassandra.Client.prototype, "execute");
      mockExecute.mockImplementation(() => {
        return fakeQueryResult;
      });

      fakeQueryResult.rows[0].get = jest
        .fn()
        .mockImplementation((input: string) => {
          switch (input) {
            case "id":
              return fakeQueryResult.rows[0].id;
            case "sender":
              return fakeQueryResult.rows[0].sender;
            case "receiver":
              return fakeQueryResult.rows[0].receiver;
            case "message":
              return fakeQueryResult.rows[0].message;
            default:
              return "0";
          }
        });
      const result = await cassandraService.getNotifications(
        fakeQueryResult.rows[0].receiver
      );
      expect(result).toHaveLength(fakeQueryResult.rows.length);
      expect(result[0]).toHaveProperty("id");
      expect(result[0].id).toStrictEqual(fakeQueryResult.rows[0].id);
      expect(result[0]).toHaveProperty("from");
      expect(result[0].from).toStrictEqual(fakeQueryResult.rows[0].sender);
      expect(result[0]).toHaveProperty("to");
      expect(result[0].to).toStrictEqual(fakeQueryResult.rows[0].receiver);
      expect(result[0]).toHaveProperty("message");
      expect(result[0].message).toStrictEqual(fakeQueryResult.rows[0].message);

      jest.resetAllMocks();
    });
  });
});
