import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("appController (e2e)", () => {
  let app;

  // eslint-disable-next-line jest/no-hooks
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
