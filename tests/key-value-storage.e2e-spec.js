const supertest = require("supertest");
const ebsiAppJwt = require("@cef-ebsi/app-jwt").default;

const config = require("../src/config");
const Server = require("../src/server");
const cassandra = require("../src/cassandraClient");
const { url, TEST_APP_NAME, privKey } = require("./config");

const {
  BadRequestError,
  NotFoundError,
  KeyTooLargeError,
  ValueTooLargeError,
} = require("../src/errors");

let request;
let server = null;
let callApi;

if (url) {
  request = supertest(url);
} else {
  server = new Server().start(config.port);
  request = supertest(server);
}

expect.extend({
  toBeHTTPError(received, ErrorClass) {
    if (!received.title || !received.status)
      return {
        message: () =>
          `received does not contain title and status. received: ${received}`,
        pass: false,
      };
    const error = new ErrorClass();
    if (received.title !== error.title) {
      return {
        message: () =>
          `expected title: ${error.title}. received: ${received.title}`,
        pass: false,
      };
    }
    if (received.status !== error.status) {
      return {
        message: () =>
          `expected title: ${error.title}. received: ${received.title}`,
        pass: false,
      };
    }
    return {
      message: () => `not expected: ${error.print()}. received: ${received}`,
      pass: true,
    };
  },
});

/* eslint jest/no-hooks: "off" */
describe("key value storage tests", () => {
  afterAll(async () => {
    if (server) {
      server.close();
      await cassandra.shutdown();
    }
  });

  it("create new session", async () => {
    expect.assertions(2);
    const agent = new ebsiAppJwt.Agent(TEST_APP_NAME, privKey);
    const requestToken = agent.createRequestPayload("ebsi-storage");

    const response = await request
      .post("/storage/v1/sessions")
      .set("Accept", "application/json")
      .send(requestToken);

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 900, // 15 minutes
        issuedAt: expect.any(Number),
      })
    );

    const token = response.body.accessToken;

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
  });

  it("create, update, and delete key", async () => {
    expect.assertions(6);

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
    await callApi
      .put(`/${key}`)
      .send(value)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(expected1);
      });

    // get key
    await callApi
      .get(`/${key}`)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(value);
      });

    // update key
    await callApi
      .put(`/${key}`)
      .send(valueUpdated)
      .expect(201)
      .then((response) => {
        expect(response.body).toStrictEqual(expected2);
      });

    // get key again after the update
    await callApi
      .get(`/${key}`)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(valueUpdated);
      });

    // update as string
    await callApi
      .put(`/${key}`)
      .set("Content-Type", "text/plain")
      .send(valueString)
      .expect(201)
      .then((response) => {
        expect(response.body).toStrictEqual(expected3);
      });

    // get key again after the update as string
    await callApi
      .get(`/${key}`)
      .expect(200)
      .then((response) => {
        expect(response.text).toBe(valueString);
      });

    // delete key
    await callApi.delete(`/${key}`).expect(204);
  });

  it("patch key", async () => {
    expect.assertions(2);

    const key = `my-key${Math.random().toString().slice(2)}`;
    const value = { list: [{ a: "A" }] };

    const expected1 = {};
    expected1[key] = value;

    // insert new key
    await callApi
      .put(`/${key}`)
      .send(value)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(expected1);
      });

    // patch key
    await callApi
      .patch(`/${key}`)
      .send([
        {
          op: "add",
          path: "/list/-",
          value: { b: "B" },
        },
      ])
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual({ list: [{ a: "A" }, { b: "B" }] });
      });
  });

  it("get list keys", async () => {
    expect.assertions(1);

    await callApi
      .get("/")
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            items: expect.arrayContaining([]),
            total: expect.any(Number),
          })
        );
      });
  });

  it("get list keys and custom page size and page after", async () => {
    expect.assertions(1);

    // send several keys
    const inputs = [];
    for (let i = 0; i < 20; i += 1) {
      const key = `my-key${Math.random().toString().slice(2)}`;
      const value = { msg: "my value" };
      inputs.push(callApi.put(`/${key}`).send(value));
    }
    await Promise.all(inputs);

    let urlNext;
    await callApi
      .get("/?page[size]=5")
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            items: expect.arrayContaining([]),
            total: 5,
            links: {
              first:
                "/storage/v1/stores/distributed/key-values?page%5Bsize%5D=5",
              next: expect.stringContaining(
                "/storage/v1/stores/distributed/key-values?page%5Bsize%5D=5&page%5Bafter%5D="
              ),
            },
          })
        );
        urlNext = response.body.links.next;
      });

    // call next page
    await callApi.get(urlNext).expect(200);
  });

  /* Test Errors */

  it("key not found error", async () => {
    expect.assertions(1);

    const key = `my-key${Math.random().toString().slice(2)}`;
    await callApi
      .get(`/${key}`)
      .expect(404)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(NotFoundError)
        );
      });
  });

  it("key not found error when deleting", async () => {
    expect.assertions(1);

    const key = `my-key${Math.random().toString().slice(2)}`;

    await callApi
      .delete(`/${key}`)
      .expect(404)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(NotFoundError)
        );
      });
  });

  it("error too large key", async () => {
    expect.assertions(1);

    const largeKey = "a".repeat(257);
    await callApi
      .put(`/${largeKey}`)
      .expect(414)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(KeyTooLargeError)
        );
      });
  });

  it("error too large value", async () => {
    expect.assertions(1);

    const largeValue = "a".repeat(1024 * 1024 + 1);
    await callApi
      .put("/my-key")
      .set("Content-Type", "text/plain")
      .send(largeValue)
      .expect(413)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(ValueTooLargeError)
        );
      });
  });

  it("bad request error for bad body in application/json", async () => {
    expect.assertions(1);

    await callApi
      .put("/my-key")
      .set("Content-Type", "application/json")
      .send("This is a text")
      .expect(400)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(BadRequestError)
        );
      });
  });

  it("bad request error for bad content-type", async () => {
    expect.assertions(1);

    await callApi
      .put("/my-key")
      .set("Content-Type", "application/x-www-form-urlencoded")
      .send("a=3")
      .expect(400)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(BadRequestError)
        );
      });
  });
});
