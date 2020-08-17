const supertest = require("supertest");
const { Agent, Scope } = require("@cef-ebsi/app-jwt");
const Server = require("../../src/server");
const cassandra = require("../../src/cassandraClient");
const { url, TEST_APP_NAME, privKey } = require("../config");
const {
  BadRequestError,
  NotFoundError,
  KeyTooLargeError,
  ValueTooLargeError,
} = require("../../src/errors");

jest.setTimeout(30000);

let request;
let server = null;
let callApi;

if (url) {
  request = supertest(url);
} else {
  server = new Server().getServer();
  request = supertest(server);
}

describe("key value storage tests", () => {
  let sessionResponse;

  // eslint-disable-next-line jest/no-hooks
  beforeAll(async () => {
    const agent = new Agent(Scope.COMPONENT, privKey, {
      issuer: TEST_APP_NAME,
    });
    const requestToken = await agent.createRequestPayload("ebsi-storage");

    sessionResponse = await request
      .post("/storage/v1/sessions")
      .set("Accept", "application/json")
      .send(requestToken);

    const token = sessionResponse.body.accessToken;

    const fn = (type) => {
      return (path) => {
        let fullPath;
        if (path.startsWith("/storage/v1")) fullPath = path;
        else fullPath = `/storage/v1/stores/distributed/key-values${path}`;

        return request[type](fullPath)
          .set("Accept", "application/json")
          .set("Authorization", `Bearer ${token}`);
      };
    };
    callApi = {
      get: fn("get"),
      post: fn("post"),
      put: fn("put"),
      patch: fn("patch"),
      delete: fn("delete"),
    };

    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  // eslint-disable-next-line jest/no-hooks
  afterAll(async () => {
    await cassandra.shutdown();
  });

  it("create new session", () => {
    expect.assertions(2);

    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body).toStrictEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 900, // 15 minutes
        issuedAt: expect.any(Number),
      })
    );
  });

  it("create, update, and delete key", async () => {
    expect.assertions(13);

    const key = `my-key${Math.random().toString().slice(2)}`;
    const value = { msg: "my value" };
    const valueUpdated = { msg: "now updated" };
    const valueString = "my value";

    const expected1 = {};
    const expected2 = {};
    const expected3 = {};
    expected1[key] = value;
    expected2[key] = valueUpdated;
    expected3[key] = valueString;

    // insert new key
    const insertResponse = await callApi.put(`/${key}`).send(value);
    expect(insertResponse.status).toBe(200);
    expect(insertResponse.body).toStrictEqual(expected1);

    // get key
    const firstGetResponse = await callApi.get(`/${key}`);
    expect(firstGetResponse.status).toBe(200);
    expect(firstGetResponse.body).toStrictEqual(value);

    // update key
    const updateResponse = await callApi.put(`/${key}`).send(valueUpdated);
    expect(updateResponse.status).toBe(201);
    expect(updateResponse.body).toStrictEqual(expected2);

    // get key again after the update
    const secondGetResponse = await callApi.get(`/${key}`);
    expect(secondGetResponse.status).toBe(200);
    expect(secondGetResponse.body).toStrictEqual(valueUpdated);

    // update as string
    const updateAsStringResponse = await callApi
      .put(`/${key}`)
      .set("Content-Type", "text/plain")
      .send(valueString);
    expect(updateAsStringResponse.status).toBe(201);
    expect(updateAsStringResponse.body).toStrictEqual(expected3);

    // get key again after the update as string
    const thirdGetResponse = await callApi.get(`/${key}`);
    expect(thirdGetResponse.status).toBe(200);
    expect(thirdGetResponse.text).toStrictEqual(valueString);

    // delete key
    const deleteResponse = await callApi.delete(`/${key}`);
    expect(deleteResponse.status).toBe(204);
  });

  it("patch key", async () => {
    expect.assertions(4);

    const key = `my-key${Math.random().toString().slice(2)}`;
    const value = { list: [{ a: "A" }] };

    const expected1 = {};
    expected1[key] = value;

    // insert new key
    const insertResponse = await callApi.put(`/${key}`).send(value);
    expect(insertResponse.status).toBe(200);
    expect(insertResponse.body).toStrictEqual(expected1);

    // patch key
    const patchResponse = await callApi.patch(`/${key}`).send([
      {
        op: "add",
        path: "/list/-",
        value: { b: "B" },
      },
    ]);
    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body).toStrictEqual({
      list: [{ a: "A" }, { b: "B" }],
    });
  });

  it("get list keys", async () => {
    expect.assertions(2);

    const response = await callApi.get("/");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: expect.arrayContaining([]),
        total: expect.any(Number),
      })
    );
  });

  it("get list keys and custom page size and page after", async () => {
    expect.assertions(3);

    // send several keys
    const inputs = [];
    for (let i = 0; i < 20; i += 1) {
      const key = `my-key${Math.random().toString().slice(2)}`;
      const value = { msg: "my value" };
      inputs.push(callApi.put(`/${key}`).send(value));
    }
    await Promise.all(inputs);

    const response = await callApi.get("/?page[size]=5");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: expect.arrayContaining([]),
        total: 5,
        links: {
          first: "/storage/v1/stores/distributed/key-values?page%5Bsize%5D=5",
          next: expect.stringContaining(
            "/storage/v1/stores/distributed/key-values?page%5Bsize%5D=5&page%5Bafter%5D="
          ),
        },
      })
    );

    const urlNext = response.body.links.next;

    // call next page
    const nextResponse = await callApi.get(urlNext);
    expect(nextResponse.status).toBe(200);
  });

  /* Test Errors */

  it("key not found error", async () => {
    expect.assertions(2);

    const key = `my-key${Math.random().toString().slice(2)}`;
    const response = await callApi.get(`/${key}`);

    expect(response.status).toBe(404);
    expect(response.body).toBeHTTPError(NotFoundError);
  });

  it("key not found error when deleting", async () => {
    expect.assertions(2);

    const key = `my-key${Math.random().toString().slice(2)}`;

    const response = await callApi.delete(`/${key}`);

    expect(response.status).toBe(404);
    expect(response.body).toBeHTTPError(NotFoundError);
  });

  it("error too large key", async () => {
    expect.assertions(2);

    const largeKey = "a".repeat(257);
    const response = await callApi.put(`/${largeKey}`);

    expect(response.status).toBe(414);
    expect(response.body).toBeHTTPError(KeyTooLargeError);
  });

  it("error too large value", async () => {
    expect.assertions(2);

    const largeValue = "a".repeat(1024 * 1024 + 1);
    const response = await callApi
      .put("/my-key")
      .set("Content-Type", "text/plain")
      .send(largeValue);

    expect(response.status).toBe(413);
    expect(response.body).toBeHTTPError(ValueTooLargeError);
  });

  it("bad request error for bad body in application/json", async () => {
    expect.assertions(2);

    const response = await callApi
      .put("/my-key")
      .set("Content-Type", "application/json")
      .send("This is a text");

    expect(response.status).toBe(400);
    expect(response.body).toBeHTTPError(BadRequestError);
  });

  it("bad request error for bad content-type", async () => {
    expect.assertions(2);

    const response = await callApi
      .put("/my-key")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send("a=3");

    expect(response.status).toBe(400);
    expect(response.body).toBeHTTPError(BadRequestError);
  });
});
