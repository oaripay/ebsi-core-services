import { Test } from "@nestjs/testing";
import { storedNotifications } from "../../../tests/utils/notifications";
import { ApiConfigModule } from "../../config/configuration";
import { CassandraService } from "../cassandra/cassandra.service";
import { NotificationsService } from "./notifications.service";
import * as utils from "./notifications.utils";

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
        .mockResolvedValue(storedNotifications);
      jest.spyOn(cassandraService, "deleteNotification").mockReturnValue();
      jest.spyOn(utils, "isExpired").mockReturnValue(false);

      const result = await notificationsService.findAll(
        storedNotifications[0].to,
        1,
        pageSize,
        `test/notifications`
      );

      expect(result).toHaveProperty("items");
      expect(result.items).toHaveLength(storedNotifications.length);
      expect(result).toHaveProperty("total");
      expect(result.total).toBe(storedNotifications.length);
      expect(result).toHaveProperty("pageSize");
      expect(result.pageSize).toBe(pageSize);
      jest.resetAllMocks();
    });

    it("should resolve paginatedResponse for only one notification", async () => {
      expect.assertions(6);
      const pageSize = 10;

      jest
        .spyOn(cassandraService, "getNotifications")
        .mockResolvedValue(storedNotifications);
      jest.spyOn(cassandraService, "deleteNotification").mockReturnValue();
      jest.spyOn(utils, "isExpired").mockReturnValueOnce(true);
      jest.spyOn(utils, "isExpired").mockReturnValueOnce(false);

      const result = await notificationsService.findAll(
        storedNotifications[0].to,
        1,
        pageSize,
        `test/notifications`
      );

      expect(result).toHaveProperty("items");
      expect(result.items).toHaveLength(1);
      expect(result).toHaveProperty("total");
      expect(result.total).toBe(1);
      expect(result).toHaveProperty("pageSize");
      expect(result.pageSize).toBe(pageSize);
      jest.resetAllMocks();
    });

    it("should resolve paginatedResponse with no items", async () => {
      expect.assertions(6);
      const pageSize = 10;

      jest
        .spyOn(cassandraService, "getNotifications")
        .mockResolvedValue(storedNotifications);
      jest.spyOn(cassandraService, "deleteNotification").mockReturnValue();
      jest.spyOn(utils, "isExpired").mockReturnValue(true);

      const result = await notificationsService.findAll(
        storedNotifications[0].to,
        1,
        pageSize,
        `test/notifications`
      );

      expect(result).toHaveProperty("items");
      expect(result.items).toHaveLength(0);
      expect(result).toHaveProperty("total");
      expect(result.total).toBe(0);
      expect(result).toHaveProperty("pageSize");
      expect(result.pageSize).toBe(pageSize);
      jest.resetAllMocks();
    });
  });
});
