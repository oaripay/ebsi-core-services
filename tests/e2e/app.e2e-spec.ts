import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module";

describe("app (e2e)", () => {
  let app;

  // eslint-disable-next-line jest/no-hooks
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("/ GET should return 404", async () => {
    expect.assertions(2);

    const response = await request(app.getHttpServer()).get("/");

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({
      statusCode: 404,
      message: "Cannot GET /",
      error: "Not Found",
    });
  });

  it("/trusted-apps-registry/v1/apps GET should return the list of apps", async () => {
    expect.assertions(3);

    const response = await request(app.getHttpServer()).get(
      "/trusted-apps-registry/v1/apps"
    );

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        first: expect.any(String),
        last: expect.any(String),
        next: expect.any(String),
        pageSize: expect.any(Number),
        prev: expect.any(String),
        total: expect.any(Number),
        items: expect.any(Array),
      })
    );

    // Every item shoud have non-empty "appName" and "pubKey" properties
    expect(
      response.body.items.every(
        (o) => o.appName.length > 0 && o.pubKey.length > 0
      )
    ).toBe(true);
  });

  it("/trusted-apps-registry/v1/apps/:appName GET should return an error for a non-existing app", async () => {
    expect.assertions(2);

    const response = await request(app.getHttpServer()).get(
      "/trusted-apps-registry/v1/apps/fakeapp"
    );

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({
      error: "Not Found",
      message: "fakeapp not found",
      statusCode: 404,
    });
  });

  it("/trusted-apps-registry/v1/apps/:appName GET should return an existing app", async () => {
    expect.assertions(2);

    const response = await request(app.getHttpServer()).get(
      "/trusted-apps-registry/v1/apps/ebsi-wallet"
    );

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        appName: "ebsi-wallet",
        pubKey: expect.any(String),
      })
    );
  });

  it("/trusted-apps-registry/v1/apps/:appName/authorized-apps GET should return 404 for a non-existing app", async () => {
    expect.assertions(2);

    const response = await request(app.getHttpServer()).get(
      "/trusted-apps-registry/v1/apps/fakeapp/authorized-apps"
    );

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({
      error: "Not Found",
      message: "Application does not exist",
      statusCode: 404,
    });
  });

  it("/trusted-apps-registry/v1/apps/:appName/authorized-apps GET should return the authorizations for an existing app", async () => {
    expect.assertions(3);

    const response = await request(app.getHttpServer()).get(
      "/trusted-apps-registry/v1/apps/ebsi-wallet/authorized-apps"
    );

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        first: expect.any(String),
        last: expect.any(String),
        next: expect.any(String),
        pageSize: expect.any(Number),
        prev: expect.any(String),
        total: expect.any(Number),
        items: expect.any(Array),
      })
    );

    // Items should be an array of { "authorizedAppName": "name-of-the-app" }
    expect(
      response.body.items.every((o) => o.authorizedAppName.length > 0)
    ).toBe(true);
  });

  it("/trusted-apps-registry/v1/apps/:appName/authorized-apps/:authorizedAppName GET should return 200 if authorization exists", async () => {
    expect.assertions(2);

    const response = await request(app.getHttpServer()).get(
      "/trusted-apps-registry/v1/apps/ebsi-wallet/authorized-apps/ebsi-storage"
    );

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      authorizedAppName: "ebsi-storage",
    });
  });

  it("/trusted-apps-registry/v1/apps/:appName/authorized-apps/:authorizedAppName GET should return 404 if the app is not authorized", async () => {
    expect.assertions(2);

    const response = await request(app.getHttpServer()).get(
      "/trusted-apps-registry/v1/apps/ebsi-wallet/authorized-apps/fakeapp"
    );

    expect(response.status).toBe(404);
    expect(response.body).toStrictEqual({
      error: "Not Found",
      message:
        "fakeapp not found in the list of authorized apps of ebsi-wallet",
      statusCode: 404,
    });
  });
});
