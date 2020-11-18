import { Test } from "@nestjs/testing";
import { ApiConfigModule } from "../../config/configuration";
import { CassandraService } from "../cassandra/cassandra.service";
import { NotificationsService } from "./notifications.service";

const notificationsCassandra = [
  {
    id: "cassandraFakeId1",
    from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
    message: JSON.stringify({ test: "test" }),
  },
  {
    id: "cassandraFakeId2",
    from: "did:ebsi:0x2F5Ea30a6dbf76FA3BF6fDb297A53684530Bb657",
    to: "did:ebsi:0xC2322cfDde2ffB61De2692D6369C4AFDAc48fe93",
    message: JSON.stringify({ test: "test" }),
  },
];

describe("Notifications service", () => {
  describe("GET /notifications", () => {
    let notificationsService: NotificationsService;
    let cassandraService: CassandraService;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [NotificationsService, CassandraService],
        imports: [ApiConfigModule],
      }).compile();
      notificationsService = moduleRef.get<NotificationsService>(
        NotificationsService
      );
      cassandraService = moduleRef.get<CassandraService>(CassandraService);
    });

    it("should resolve paginatedResponse for two valid notifications", async () => {
      expect.assertions(6);
      const pageSize = 10;

      jest
        .spyOn(cassandraService, "getNotifications")
        .mockResolvedValue(notificationsCassandra);

      const result = await notificationsService.findAll(
        notificationsCassandra[0].to,
        1,
        pageSize,
        `test/notifications`
      );

      expect(result).toHaveProperty("items");
      expect(result.items).toHaveLength(notificationsCassandra.length);
      expect(result).toHaveProperty("total");
      expect(result.total).toBe(notificationsCassandra.length);
      expect(result).toHaveProperty("pageSize");
      expect(result.pageSize).toBe(pageSize);
      jest.resetAllMocks();
    });
  });
});
