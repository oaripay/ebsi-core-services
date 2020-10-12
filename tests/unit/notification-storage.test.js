const supertest = require("supertest");
const cassandraDriver = require("cassandra-driver");
const jose = require("jose");
const config = require("../../src/config");
const Server = require("../../src/server");
const {
  BadRequestError,
  NotFoundError,
  InternalServerError,
} = require("../../src/errors");

jest.mock("cassandra-driver");

const server = new Server().getServer();
const request = supertest(server);

let callApi;

const queries = {
  getNotification:
    "select * from notification_storage where id = ? allow filtering",
  updateNotification:
    "update notification_storage set sender = ?, receiver = ?, message = ? where id = ?",
  insertNotification:
    "insert into notification_storage (id, created, sender, receiver, message) values (?, toTimestamp(now()), ?, ?, ?)",
  saveNotification:
    "insert into notification_historical_storage (id, created, deleted, sender, receiver, message) values (?, ?, toTimestamp(now()), ?, ?, ?)",
  deleteNotification: "delete from notification_storage where id = ?",
  getListNotifications: (sender, receiver, history) => {
    let query = "select * from ";
    if (history) query += "notification_historical_storage";
    else query += "notification_storage";

    if (sender && receiver) {
      query += " where sender = ? and receiver = ?";
    } else if (sender) {
      query += " where sender = ?";
    } else if (receiver) {
      query += " where receiver = ?";
    }

    query += " allow filtering";
    return query;
  },
};

const dummyData = [
  {
    id: "e406c4d3-a184-44f4-8f9d-407e87081dff",
    created: "2020-01-01T00:00:00Z",
    sender: "0x4fC083473a44a6F6D2044F17552b1942a517bF8D",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 1"}',
  },
  {
    id: "932729b0-dcb0-4304-a376-5dba15148864",
    created: "2020-01-02T00:00:00Z",
    sender: "0x1A3AD65DF5934fE072e84f9220Cb82146Bbd62C9",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 2"}',
  },
];

const extensiveDummyData = [
  {
    id: "e406c4d3-a184-44f4-8f9d-407e87081dff",
    created: "2020-01-01T00:00:00Z",
    sender: "0x4fC083473a44a6F6D2044F17552b1942a517bF8D",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 1"}',
  },
  {
    id: "932729b0-dcb0-4304-a376-5dba15148864",
    created: "2020-01-02T00:00:00Z",
    sender: "0x1A3AD65DF5934fE072e84f9220Cb82146Bbd62C9",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 2"}',
  },
  {
    id: "e406c4d3-a184-44f4-8f9d-407e87081d01",
    created: "2020-01-01T00:00:00Z",
    sender: "0x4fC083473a44a6F6D2044F17552b1942a517bF8D",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 3"}',
  },
  {
    id: "932729b0-dcb0-4304-a376-5dba15148801",
    created: "2020-01-02T00:00:00Z",
    sender: "0x1A3AD65DF5934fE072e84f9220Cb82146Bbd62C9",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 4"}',
  },
  {
    id: "e406c4d3-a184-44f4-8f9d-407e87081d02",
    created: "2020-01-01T00:00:00Z",
    sender: "0x4fC083473a44a6F6D2044F17552b1942a517bF8D",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 5"}',
  },
  {
    id: "932729b0-dcb0-4304-a376-5dba15148802",
    created: "2020-01-02T00:00:00Z",
    sender: "0x1A3AD65DF5934fE072e84f9220Cb82146Bbd62C9",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 6"}',
  },
  {
    id: "e406c4d3-a184-44f4-8f9d-407e87081d03",
    created: "2020-01-01T00:00:00Z",
    sender: "0x4fC083473a44a6F6D2044F17552b1942a517bF8D",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 7"}',
  },
  {
    id: "932729b0-dcb0-4304-a376-5dba15148803",
    created: "2020-01-02T00:00:00Z",
    sender: "0x1A3AD65DF5934fE072e84f9220Cb82146Bbd62C9",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 8"}',
  },
  {
    id: "e406c4d3-a184-44f4-8f9d-407e87081d04",
    created: "2020-01-01T00:00:00Z",
    sender: "0x4fC083473a44a6F6D2044F17552b1942a517bF8D",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 9"}',
  },
  {
    id: "932729b0-dcb0-4304-a376-5dba15148804",
    created: "2020-01-02T00:00:00Z",
    sender: "0x1A3AD65DF5934fE072e84f9220Cb82146Bbd62C9",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 10"}',
  },
  {
    id: "e406c4d3-a184-44f4-8f9d-407e87081d05",
    created: "2020-01-01T00:00:00Z",
    sender: "0x4fC083473a44a6F6D2044F17552b1942a517bF8D",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 11"}',
  },
  {
    id: "932729b0-dcb0-4304-a376-5dba15148805",
    created: "2020-01-02T00:00:00Z",
    sender: "0x1A3AD65DF5934fE072e84f9220Cb82146Bbd62C9",
    receiver: "0x1c74563f88fcE476C98a4Ffcd339e60975442f5a",
    message: '{"msg":"message 12"}',
  },
];

const dummyDataParsed = dummyData.map(({ id, sender, receiver, message }) => ({
  id,
  sender,
  receiver,
  message: JSON.parse(message),
}));

const extensiveDummyDataParsed = extensiveDummyData.map(
  ({ id, sender, receiver, message }) => ({
    id,
    sender,
    receiver,
    message: JSON.parse(message),
  })
);

function cassandraResponse(rows, pageState = null) {
  return Promise.resolve({
    info: {
      isSchemaInAgreement: true,
    },
    first: () => rows[0],
    rows,
    pageState,
  });
}

const mockExecute = jest.spyOn(cassandraDriver.Client.prototype, "execute");

// function to get calls of cassandra.execute in the instance notification
function getExecuteCalls() {
  const instanceNotification = cassandraDriver.Client.mock.instances[0];
  return instanceNotification.execute.mock.calls;
}

describe("notification storage tests", () => {
  // eslint-disable-next-line jest/no-hooks
  beforeAll(async () => {
    const token = jose.JWT.sign({ aud: config.API_NAME }, config.privKey);
    const fn = (type) => {
      return (method) => {
        return request[type](
          `/storage/v1/stores/distributed/notifications${method}`
        )
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

  // eslint-disable-next-line jest/no-hooks
  beforeEach(() => {
    // clear calls to cassandra.execute
    const instanceNotification = cassandraDriver.Client.mock.instances[0];
    instanceNotification.execute.mock.calls = [];
  });

  it("get list notifications all users", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse(dummyData);
    });

    const response = await callApi.get("/");

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: dummyDataParsed,
        total: 2,
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const query = queries.getListNotifications(false, false, false);
    const opts = { prepare: true, fetchSize: 10 };

    expect(callSearch).toStrictEqual(expect.arrayContaining([query, [], opts]));
  });

  it("get list notifications for receiver", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse(dummyData);
    });

    const response = await callApi.get(`/?receiver=${dummyData[0].receiver}`);

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: dummyDataParsed,
        total: 2,
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const query = queries.getListNotifications(false, true, false);
    const opts = { prepare: true, fetchSize: 10 };

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([query, [dummyData[0].receiver], opts])
    );
  });

  it("get list notifications for sender", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([dummyData[0]]);
    });

    const response = await callApi.get(`/?sender=${dummyData[0].sender}`);

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: [dummyDataParsed[0]],
        total: 1,
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const query = queries.getListNotifications(true, false, false);
    const opts = { prepare: true, fetchSize: 10 };

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([query, [dummyData[0].sender], opts])
    );
  });

  it("get list notifications for sender and receiver", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([dummyData[0]]);
    });

    const response = await callApi.get(
      `/?sender=${dummyData[0].sender}&receiver=${dummyData[0].receiver}`
    );

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: [dummyDataParsed[0]],
        total: 1,
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const query = queries.getListNotifications(true, true, false);
    const opts = { prepare: true, fetchSize: 10 };

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([
        query,
        [dummyData[0].sender, dummyData[0].receiver],
        opts,
      ])
    );
  });

  it("get list notifications for history", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      const data = {
        ...dummyData[0],
        deleted: "2020-06-01T00:00:00Z",
      };
      return cassandraResponse([data]);
    });

    const response = await callApi.get(
      `/?history=true&receiver=${dummyData[0].receiver}`
    );

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: [
          {
            ...dummyDataParsed[0],
            created: "2020-01-01T00:00:00Z",
            deleted: "2020-06-01T00:00:00Z",
          },
        ],
        total: 1,
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const query = queries.getListNotifications(false, true, true);
    const opts = { prepare: true, fetchSize: 10 };

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([query, [dummyData[0].receiver], opts])
    );
  });

  it("get list notifications and custom page size", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse(dummyData);
    });

    const response = await callApi.get(
      `/?page[size]=11&receiver=${dummyData[0].receiver}`
    );

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: dummyDataParsed,
        total: 2,
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const query = queries.getListNotifications(false, true, false);
    const opts = { prepare: true, fetchSize: 11 };

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([query, [dummyData[0].receiver], opts])
    );
  });

  it("get list of notifications and custom page size with pageAfter", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse(extensiveDummyData.slice(6), "efgh");
    });

    const pageSize = 6;
    const pageAfter = "id12345";
    const { receiver } = extensiveDummyDataParsed[0];

    const response = await callApi.get(
      `/?page[size]=${pageSize}&page[after]=${pageAfter}&receiver=${receiver}`
    );

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: extensiveDummyDataParsed.slice(6),
        total: extensiveDummyData.slice(6).length,
        pageSize,
        links: {
          first: `/storage/v1/stores/distributed/notifications?receiver=${receiver}&page%5Bsize%5D=6`,
          next: `/storage/v1/stores/distributed/notifications?receiver=${receiver}&page%5Bsize%5D=6&page%5Bafter%5D=efgh`,
        },
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const query = queries.getListNotifications(false, true, false);
    const opts = { prepare: true, fetchSize: pageSize, pageState: pageAfter };

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([
        query,
        [extensiveDummyDataParsed[0].receiver],
        opts,
      ])
    );
  });

  it("get list notifications and different page", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse(dummyData);
    });

    const response = await callApi.get(
      `/?page[x]=11&receiver=${dummyData[0].receiver}`
    );

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: dummyDataParsed,
        total: 2,
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const query = queries.getListNotifications(false, true, false);
    const opts = { prepare: true, fetchSize: 10 };

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([query, [dummyData[0].receiver], opts])
    );
  });

  it("add notification", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([]);
    });

    const response = await callApi.put("/").send({
      sender: "sender",
      receiver: "receiver",
      message: { msg: "message" },
    });

    expect(response.body).toStrictEqual({
      id: expect.any(String),
      sender: "sender",
      receiver: "receiver",
      message: { msg: "message" },
    });
    expect(response.status).toBe(200);

    const [callInsert] = getExecuteCalls();

    expect(callInsert).toStrictEqual(
      expect.arrayContaining([
        queries.insertNotification,
        expect.arrayContaining(["sender", "receiver", '{"msg":"message"}']),
      ])
    );
  });

  it("get notification by id", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([dummyData[0]]);
    });

    const response = await callApi.get(`/${dummyData[0].id}`);

    expect(response.body).toStrictEqual(dummyDataParsed[0]);
    expect(response.status).toBe(200);

    const [call] = getExecuteCalls();

    expect(call).toStrictEqual(
      expect.arrayContaining([queries.getNotification, [dummyData[0].id]])
    );
  });

  it("update notification", async () => {
    expect.assertions(4);

    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getNotification:
          return cassandraResponse([dummyData[0]]);
        case queries.updateNotification:
          return cassandraResponse([]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    const response = await callApi.put(`/${dummyData[0].id}`).send({
      sender: "new sender",
      receiver: "new receiver",
      message: { msg: "now updated" },
    });

    expect(response.body).toStrictEqual({
      id: dummyData[0].id,
      sender: "new sender",
      receiver: "new receiver",
      message: { msg: "now updated" },
    });
    expect(response.status).toBe(201);

    const [callSearch, callUpdate] = getExecuteCalls();

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getNotification, [dummyData[0].id]])
    );
    expect(callUpdate).toStrictEqual(
      expect.arrayContaining([
        queries.updateNotification,
        [
          "new sender",
          "new receiver",
          '{"msg":"now updated"}',
          dummyData[0].id,
        ],
      ])
    );
  });

  it("delete notification", async () => {
    expect.assertions(4);

    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getNotification:
          return cassandraResponse([dummyData[0]]);
        case queries.saveNotification:
        case queries.deleteNotification:
          return cassandraResponse([]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    const response = await callApi.delete(`/${dummyData[0].id}`);
    expect(response.status).toBe(204);

    // when a notification is deleted there are 3 calls to cassandra:
    // 1- get the notification
    // 2- save the notification in the history table
    // 3- delete the notification
    const [callSearch, callInsertHistory, callDelete] = getExecuteCalls();

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getNotification, [dummyData[0].id]])
    );
    expect(callInsertHistory).toStrictEqual(
      expect.arrayContaining(
        [queries.saveNotification],
        [
          dummyData[0].id,
          dummyData[0].created,
          dummyData[0].sender,
          dummyData[0].receiver,
          dummyData[0].message,
        ]
      )
    );
    expect(callDelete).toStrictEqual(
      expect.arrayContaining([queries.deleteNotification, [dummyData[0].id]])
    );
  });

  /* Test Errors */

  it("notification not found error", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([]);
    });

    const response = await callApi.get("/my-id");

    expect(response.body).toBeHTTPError(NotFoundError);
    expect(response.status).toBe(404);
  });

  it("notification not found error when updating", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([]);
    });

    const response = await callApi.put("/my-id").send({
      sender: "sender",
      receiver: "receiver",
      message: { msg: "message" },
    });

    expect(response.body).toBeHTTPError(NotFoundError);
    expect(response.status).toBe(404);
  });

  it("notification not found error when deleting", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([]);
    });

    const response = await callApi.delete("/my-id");

    expect(response.body).toBeHTTPError(NotFoundError);
    expect(response.status).toBe(404);
  });

  it("bad request error for bad body in application/json", async () => {
    expect.assertions(2);

    const response = await callApi
      .put("/my-key")
      .set("Content-Type", "application/json")
      .send("This is a text");

    expect(response.body).toBeHTTPError(BadRequestError);
    expect(response.status).toBe(400);
  });

  it("internal error in cassandra for insert", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      if (query === queries.insertNotification) return "Cassandra error";
      return cassandraResponse([]);
    });

    const response = await callApi.put("/").send({
      sender: "sender",
      receiver: "receiver",
      message: { msg: "message" },
    });

    expect(response.body).toBeHTTPError(InternalServerError);
    expect(response.status).toBe(500);
  });

  it("internal error in cassandra for update", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      if (query === queries.updateNotification) return "Cassandra error";
      return cassandraResponse([dummyData[0]]);
    });

    const response = await callApi.put("/my-id").send({
      sender: "sender",
      receiver: "receiver",
      message: { msg: "message" },
    });

    expect(response.body).toBeHTTPError(InternalServerError);
    expect(response.status).toBe(500);
  });

  it("internal error in cassandra for delete", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      if (query === queries.deleteNotification) return "Cassandra error";
      return cassandraResponse([dummyData[0]]);
    });

    const response = await callApi.delete("/my-id");

    expect(response.body).toBeHTTPError(InternalServerError);
    expect(response.status).toBe(500);
  });

  it("internal error in cassandra for insert in history (delete)", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      if (query === queries.saveNotification) return "Cassandra error";
      return cassandraResponse([dummyData[0]]);
    });

    const response = await callApi.delete("/my-id");

    expect(response.body).toBeHTTPError(InternalServerError);
    expect(response.status).toBe(500);
  });
});
