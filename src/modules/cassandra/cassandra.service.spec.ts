import { Test } from "@nestjs/testing";
import cassandra from "cassandra-driver";
import { ApiConfigModule } from "../../config/configuration";
import { CassandraService } from "./cassandra.service";
import {
  fakeEmptyQueryResult,
  fakeQueryResult,
} from "../../../tests/utils/notifications";

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
      expect.assertions(13);
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
            case "issuancedate":
              return fakeQueryResult.rows[0].issuanceDate;
            case "expirationdate":
              return fakeQueryResult.rows[0].expirationDate;
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
      expect(result[0]).toHaveProperty("expirationDate");
      expect(result[0].expirationDate).toStrictEqual(
        fakeQueryResult.rows[0].expirationDate
      );
      expect(result[0]).toHaveProperty("issuanceDate");
      expect(result[0].issuanceDate).toStrictEqual(
        fakeQueryResult.rows[0].issuanceDate
      );
      expect(result[0]).toHaveProperty("message");
      expect(result[0].message).toStrictEqual(fakeQueryResult.rows[0].message);

      jest.resetAllMocks();
    });
  });
});
