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

describe("notification storage tests", () => {
  // eslint-disable-next-line jest/no-hooks
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
    expect.assertions(11);

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

    // add notification
    const insertResponse = await callApi.put("/").send(notification);

    expect(insertResponse.status).toBe(200);
    expect(insertResponse.body).toStrictEqual({
      id: expect.any(String),
      ...notification,
    });

    const { id } = insertResponse.body;

    // get notification by id
    const getResponse = await callApi.get(`/${id}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toStrictEqual({
      id,
      ...notification,
    });

    // update notification
    const updateResponse = await callApi
      .put(`/${id}`)
      .send(notificationUpdated);
    expect(updateResponse.status).toBe(201);
    expect(updateResponse.body).toStrictEqual({
      id,
      ...notificationUpdated,
    });

    // get notification after the update
    const secondGetResponse = await callApi.get(`/${id}`);
    expect(secondGetResponse.status).toBe(200);
    expect(secondGetResponse.body).toStrictEqual({
      id,
      ...notificationUpdated,
    });

    // delete notification
    const deleteResponse = await callApi.delete(`/${id}`);
    expect(deleteResponse.status).toBe(204);

    // check history
    const checkHistoryResponse = await callApi.get(
      `/?history=true&receiver=${notification.receiver}`
    );

    expect(checkHistoryResponse.status).toBe(200);
    expect(checkHistoryResponse.body).toStrictEqual(
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

  it("get list of notifications and custom page size with pageAfter", async () => {
    expect.assertions(3);

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

    const response = await callApi.get(`/?page[size]=5&receiver=${receiver}`);

    expect(response.status).toBe(200);
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

    const urlNext = response.body.links.next;

    // call next page
    const nextResponse = await callApi.get(urlNext);
    expect(nextResponse.status).toBe(200);
  });

  /* Test Errors */

  it("notification not found error", async () => {
    expect.assertions(2);

    const id = Math.random().toString().slice(2);

    const response = await callApi.get(`/${id}`);

    expect(response.status).toBe(404);
    expect(response.body).toBeHTTPError(NotFoundError);
  });

  it("notification not found error when updating", async () => {
    expect.assertions(2);

    const id = Math.random().toString().slice(2);

    const response = await callApi.put(`/${id}`).send({
      sender: "sender",
      receiver: "receiver",
      message: { msg: "message" },
    });

    expect(response.status).toBe(404);
    expect(response.body).toBeHTTPError(NotFoundError);
  });

  it("notification not found error when deleting", async () => {
    expect.assertions(2);

    const id = Math.random().toString().slice(2);

    const response = await callApi.delete(`/${id}`);

    expect(response.status).toBe(404);
    expect(response.body).toBeHTTPError(NotFoundError);
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
});
