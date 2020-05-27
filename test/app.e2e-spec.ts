import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import request from "supertest";
import { AppModule } from "../src/app.module";
import configuration from "../src/config/configuration";

describe("appController (e2e)", () => {
  let app;

  // eslint-disable-next-line jest/no-hooks
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [".env.test", ".env"],
          load: [configuration],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("/ (GET)", async () => {
    expect.assertions(2);

    const response = await request(app.getHttpServer()).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toStrictEqual("Hello World!");
  });
});
