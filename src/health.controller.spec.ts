import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: [".env.test.local", ".env.test", ".env.local", ".env"],
        }),
        TerminusModule,
      ],
      controllers: [HealthController],
    }).compile();

    healthController = moduleRef.get<HealthController>(HealthController);
  });

  describe("check", () => {
    it("should return 'ok'", async () => {
      expect.assertions(1);

      // TODO: mock Terminus

      expect(await healthController.check()).toStrictEqual({
        details: { "ebsi-apis": { status: "up" } },
        error: {},
        info: { "ebsi-apis": { status: "up" } },
        status: "ok",
      });
    });
  });
});
