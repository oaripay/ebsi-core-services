const supertest = require("supertest");
const { Agent, Scope } = require("@cef-ebsi/app-jwt").default;
const ethers = require("ethers");

const Server = require("../../src/server");
const cassandra = require("../../src/cassandraClient");
const { url, TEST_APP_NAME, privKey } = require("../config");

const { BadRequestError, NotFoundError } = require("../../src/errors");

let request;
let server = null;
let callApi;

if (url) {
  request = supertest(url);
} else {
  server = new Server().getServer();
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
describe("notification storage tests", () => {
  afterAll(async () => {
    await cassandra.shutdown();
  });

  it("create new session", async () => {
    expect.assertions(2);
    const agent = new Agent(Scope.COMPONENT, privKey, {
      issuer: TEST_APP_NAME,
    });
    const requestToken = await agent.createRequestPayload("ebsi-storage");

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
        else fullPath = `/storage/v1/stores/distributed/notifications${path}`;

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

  it("add, update, delete notification and check history", async () => {
    expect.assertions(5);

    const notification = {
      sender: ethers.Wallet.createRandom().address,
      receiver: ethers.Wallet.createRandom().address,
      message: { msg: "message" },
    };

    const notificationUpdated = {
      sender: notification.sender,
      receiver: notification.receiver,
      message: { msg: "updated" },
    };

    let id;

    // add notification
    await callApi
      .put("/")
      .send(notification)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual({
          id: expect.any(String),
          ...notification,
        });
        id = response.body.id;
      });

    // get notification by id
    await callApi
      .get(`/${id}`)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual({
          id,
          ...notification,
        });
      });

    // update notification
    await callApi
      .put(`/${id}`)
      .send(notificationUpdated)
      .expect(201)
      .then((response) => {
        expect(response.body).toStrictEqual({
          id,
          ...notificationUpdated,
        });
      });

    // get notification after the update
    await callApi
      .get(`/${id}`)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual({
          id,
          ...notificationUpdated,
        });
      });

    // delete notification
    await callApi.delete(`/${id}`).expect(204);

    // check history
    await callApi
      .get(`/?history=true&receiver=${notification.receiver}`)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            items: [
              {
                ...notificationUpdated,
                id,
                created: expect.any(String),
                deleted: expect.any(String),
              },
            ],
            total: 1,
            pageSize: 10,
            links: {
              first: expect.stringContaining(
                "/storage/v1/stores/distributed/notifications?history=true&receiver="
              ),
              last: expect.stringContaining(
                "/storage/v1/stores/distributed/notifications?history=true&receiver="
              ),
            },
          })
        );
      });
  });

  it("get list of notifications and custom page size with pageAfter", async () => {
    expect.assertions(1);

    // add several notifications to the same receiver
    const receiver = ethers.Wallet.createRandom().address;
    const inputs = [];
    for (let i = 0; i < 20; i += 1) {
      const notification = {
        sender: ethers.Wallet.createRandom().address,
        receiver,
        message: { msg: "message" },
      };
      inputs.push(callApi.put("/").send(notification));
    }
    await Promise.all(inputs);

    let urlNext;

    await callApi
      .get(`/?page[size]=5&receiver=${receiver}`)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            items: expect.arrayContaining([]),
            total: 5,
            pageSize: 5,
            links: {
              first: `/storage/v1/stores/distributed/notifications?receiver=${receiver}&page%5Bsize%5D=5`,
              next: expect.stringContaining(
                `/storage/v1/stores/distributed/notifications?receiver=${receiver}&page%5Bsize%5D=5&page%5Bafter%5D=`
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

  it("notification not found error", async () => {
    expect.assertions(1);

    const id = Math.random().toString().slice(2);

    await callApi
      .get(`/${id}`)
      .expect(404)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(NotFoundError)
        );
      });
  });

  it("notification not found error when updating", async () => {
    expect.assertions(1);

    const id = Math.random().toString().slice(2);

    await callApi
      .put(`/${id}`)
      .send({
        sender: "sender",
        receiver: "receiver",
        message: { msg: "message" },
      })
      .expect(404)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(NotFoundError)
        );
      });
  });

  it("notification not found error when deleting", async () => {
    expect.assertions(1);

    const id = Math.random().toString().slice(2);

    await callApi
      .delete(`/${id}`)
      .expect(404)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(NotFoundError)
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
});
