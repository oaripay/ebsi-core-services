import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";

describe("app", () => {
  let app;

  // eslint-disable-next-line jest/no-hooks
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("/ GET", async () => {
    expect.assertions(2);

    const response = await request(app.getHttpServer()).get("/");

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({
      statusCode: 404,
      message: "Cannot GET /",
      error: "Not Found",
    });
  });
});
