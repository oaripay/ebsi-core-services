const supertest = require("supertest");
const cassandraDriver = require("cassandra-driver");
const jose = require("jose");

const config = require("../src/config");
const Server = require("../src/server");

const {
  BadRequestError,
  NotFoundError,
  KeyTooLargeError,
  ValueTooLargeError,
  InternalError,
} = require("../src/errors");

jest.mock("cassandra-driver");

const server = new Server().start(config.port, config.testMode);
const request = supertest(server);

let callKeyValue;

const queries = {
  getListKeys: "select key from key_value_storage",
  getKey: "select value from key_value_storage where key = ? allow filtering",
  updateKey: "update key_value_storage set value = ? where key = ? if exists",
  insertKey: "insert into key_value_storage (key, value) values (?, ?)",
  deleteKey: "delete from key_value_storage where key = ? if exists",
};

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

// function to get calls of cassandra.execute in the instance key value
function getExecuteCalls() {
  const instanceKeyValue = cassandraDriver.Client.mock.instances[1];
  return instanceKeyValue.execute.mock.calls;
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
    server.close();
  });

  beforeAll(async () => {
    const token = jose.JWT.sign({ aud: config.API_NAME }, config.privKey);
    const fn = (type) => {
      return (method) => {
        return request[type](
          `/storage/v1/stores/distributed/key-values${method}`
        )
          .set("Accept", "application/json")
          .set("Authorization", `Bearer ${token}`);
      };
    };
    callKeyValue = {
      get: fn("get"),
      post: fn("post"),
      put: fn("put"),
      patch: fn("patch"),
      delete: fn("delete"),
    };
  });

  beforeEach(() => {
    // clear calls to cassandra.execute
    const instanceKeyValue = cassandraDriver.Client.mock.instances[1];
    instanceKeyValue.execute.mock.calls = [];
  });

  it("get list keys", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getListKeys:
          return cassandraResponse([
            {
              key: "my-key1",
              value: "my value 1",
            },
            {
              key: "my-key2",
              value: '{"msg":"my value 2"}',
            },
          ]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    await callKeyValue
      .get("/")
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            items: ["my-key1", "my-key2"],
            total: 2,
          })
        );
      });

    const [callSearch] = getExecuteCalls();
    const opts = { prepare: true, fetchSize: 10 };
    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getListKeys, [], opts])
    );
  });

  it("get list keys and custom page size", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getListKeys:
          return cassandraResponse([
            {
              key: "my-key1",
              value: "my value 1",
            },
            {
              key: "my-key2",
              value: '{"msg":"my value 2"}',
            },
          ]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    await callKeyValue
      .get("/?page[size]=11")
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            items: ["my-key1", "my-key2"],
            total: 2,
          })
        );
      });

    const [callSearch] = getExecuteCalls();
    const opts = { prepare: true, fetchSize: 11 };
    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getListKeys, [], opts])
    );
  });

  it("get list keys and custom page size and pageAfter", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getListKeys:
          return cassandraResponse(
            [
              {
                key: "my-key1",
                value: "my value 1",
              },
              {
                key: "my-key2",
                value: '{"msg":"my value 2"}',
              },
            ],
            "efgh"
          );
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    await callKeyValue
      .get("/?page[size]=11&page[after]=abcd")
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            items: ["my-key1", "my-key2"],
            total: 2,
            links: {
              first:
                "/storage/v1/stores/distributed/key-values?page%5Bsize%5D=11",
              next:
                "/storage/v1/stores/distributed/key-values?page%5Bsize%5D=11&page%5Bafter%5D=efgh",
            },
          })
        );
      });

    const [callSearch] = getExecuteCalls();
    const opts = { prepare: true, fetchSize: 11, pageState: "abcd" };
    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getListKeys, [], opts])
    );
  });

  it("get list keys and different query", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getListKeys:
          return cassandraResponse([
            {
              key: "my-key1",
              value: "my value 1",
            },
            {
              key: "my-key2",
              value: '{"msg":"my value 2"}',
            },
          ]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    await callKeyValue
      .get("/?page[xxx]=yyy")
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            items: ["my-key1", "my-key2"],
            total: 2,
          })
        );
      });

    const [callSearch] = getExecuteCalls();
    const opts = { prepare: true, fetchSize: 10 };
    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getListKeys, [], opts])
    );
  });

  it("create key", async () => {
    expect.assertions(3);

    let updated = false;
    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getKey:
          if (updated)
            return cassandraResponse([
              {
                key: "my-key",
                value: '{"msg":"my value"}',
              },
            ]);
          return cassandraResponse([]);
        case queries.insertKey:
          updated = true;
          return cassandraResponse([]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    await callKeyValue
      .put("/my-key")
      .send({ msg: "my value" })
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual({
          "my-key": { msg: "my value" },
        });
      });

    const [callSearch, callInsert] = getExecuteCalls();
    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getKey, ["my-key"]])
    );
    expect(callInsert).toStrictEqual(
      expect.arrayContaining([
        queries.insertKey,
        ["my-key", '{"msg":"my value"}'],
      ])
    );
  });

  it("create key simple value", async () => {
    expect.assertions(3);

    let updated = false;
    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getKey:
          if (updated)
            return cassandraResponse([
              {
                key: "my-key",
                value: "my value",
              },
            ]);
          return cassandraResponse([]);
        case queries.insertKey:
          updated = true;
          return cassandraResponse([]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    await callKeyValue
      .put("/my-key")
      .set("Content-Type", "text/plain")
      .send("my value")
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual({
          "my-key": "my value",
        });
      });

    const [callSearch, callInsert] = getExecuteCalls();
    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getKey, ["my-key"]])
    );
    expect(callInsert).toStrictEqual(
      expect.arrayContaining([queries.insertKey, ["my-key", "my value"]])
    );
  });

  it("get key simple value", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getKey:
          return cassandraResponse([
            {
              key: "my-key",
              value: "my value",
            },
          ]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    await callKeyValue
      .get("/my-key")
      .expect(200)
      .then((response) => {
        expect(response.text).toBe("my value");
      });

    const [call] = getExecuteCalls();
    expect(call).toStrictEqual(
      expect.arrayContaining([queries.getKey, ["my-key"]])
    );
  });

  it("get key as json", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getKey:
          return cassandraResponse([
            {
              key: "my-key",
              value: '{"msg":"message"}',
            },
          ]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    await callKeyValue
      .get("/my-key")
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual({ msg: "message" });
      });

    const [call] = getExecuteCalls();
    expect(call).toStrictEqual(
      expect.arrayContaining([queries.getKey, ["my-key"]])
    );
  });

  it("update key", async () => {
    expect.assertions(3);

    let updated = false;
    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getKey:
          if (updated)
            return cassandraResponse([
              {
                key: "my-key",
                value: '{"msg":"now updated"}',
              },
            ]);
          return cassandraResponse([
            {
              key: "my-key",
              value: '{"msg":"old message"}',
            },
          ]);
        case queries.updateKey:
          updated = true;
          return cassandraResponse([]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    await callKeyValue
      .put("/my-key")
      .send({ msg: "now updated" })
      .expect(201)
      .then((response) => {
        expect(response.body).toStrictEqual({
          "my-key": { msg: "now updated" },
        });
      });

    const [callSearch, callUpdate] = getExecuteCalls();
    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getKey, ["my-key"]])
    );
    expect(callUpdate).toStrictEqual(
      expect.arrayContaining([
        queries.updateKey,
        ['{"msg":"now updated"}', "my-key"],
      ])
    );
  });

  it("patch key", async () => {
    expect.assertions(3);

    let updated = false;
    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getKey:
          if (updated)
            return cassandraResponse([
              {
                key: "my-key",
                value: '{"list":[{"a":"A"},{"b":"B"}]}',
              },
            ]);
          return cassandraResponse([
            {
              key: "my-key",
              value: '{"list":[{"a":"A"}]}',
            },
          ]);
        case queries.updateKey:
          updated = true;
          return cassandraResponse([]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    await callKeyValue
      .patch("/my-key")
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

    const [callSearch, callUpdate] = getExecuteCalls();
    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getKey, ["my-key"]])
    );
    expect(callUpdate).toStrictEqual(
      expect.arrayContaining([
        queries.updateKey,
        [`{"list":[{"a":"A"},{"b":"B"}]}`, "my-key"],
      ])
    );
  });

  it("delete key", async () => {
    expect.assertions(2);

    let updated = false;
    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getKey:
          if (updated) return cassandraResponse([]);
          return cassandraResponse([
            {
              key: "my-key",
              value: "my value",
            },
          ]);
        case queries.deleteKey:
          updated = true;
          return cassandraResponse([]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    await callKeyValue.delete("/my-key").expect(204);

    const [callSearch, callDelete] = getExecuteCalls();
    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getKey, ["my-key"]])
    );
    expect(callDelete).toStrictEqual(
      expect.arrayContaining([queries.deleteKey, ["my-key"]])
    );
  });

  /* Test Errors */

  it("key not found error", async () => {
    expect.assertions(1);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([]);
    });

    await callKeyValue
      .get("/my-key")
      .expect(404)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(NotFoundError)
        );
      });
  });

  it("key not found error when deleting", async () => {
    expect.assertions(1);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([]);
    });

    await callKeyValue
      .delete("/my-key")
      .expect(404)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(NotFoundError)
        );
      });
  });

  it("error too large key", async () => {
    expect.assertions(2);

    const largeKey = "a".repeat(257);
    await callKeyValue
      .put(`/${largeKey}`)
      .expect(414)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(KeyTooLargeError)
        );
      });

    const calls = getExecuteCalls();
    expect(calls).toHaveLength(0);
  });

  it("error too large value", async () => {
    expect.assertions(2);

    const largeValue = "a".repeat(1024 * 1024 + 1);
    await callKeyValue
      .put("/my-key")
      .set("Content-Type", "text/plain")
      .send(largeValue)
      .expect(413)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(ValueTooLargeError)
        );
      });

    const calls = getExecuteCalls();
    expect(calls).toHaveLength(0);
  });

  it("bad request error for patch a text", async () => {
    expect.assertions(1);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([
        {
          key: "my-key",
          value: "this is not an object",
        },
      ]);
    });

    await callKeyValue
      .patch("/my-key")
      .send([
        {
          op: "add",
          path: "/list/-",
          value: { b: "B" },
        },
      ])
      .expect(400)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(BadRequestError)
        );
      });
  });

  it("bad request error for bad patch", async () => {
    expect.assertions(1);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([
        {
          key: "my-key",
          value: {},
        },
      ]);
    });

    await callKeyValue
      .patch("/my-key")
      .send([
        {
          op: "badOperation",
        },
      ])
      .expect(400)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(BadRequestError)
        );
      });
  });

  it("bad request error for bad body in application/json", async () => {
    expect.assertions(1);

    await callKeyValue
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

    await callKeyValue
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

  it("internal error in cassandra for search", async () => {
    expect.assertions(1);

    mockExecute.mockImplementation((query) => {
      if (query === queries.getKey) return "Cassandra error";
      return cassandraResponse([]);
    });

    await callKeyValue
      .put("/my-key")
      .send({ a: "A" })
      .expect(500)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(InternalError)
        );
      });
  });

  it("internal error in cassandra for insert", async () => {
    expect.assertions(1);

    mockExecute.mockImplementation((query) => {
      if (query === queries.insertKey) return "Cassandra error";
      return cassandraResponse([]);
    });

    await callKeyValue
      .put("/my-key")
      .send({ a: "A" })
      .expect(500)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(InternalError)
        );
      });
  });

  it("internal error in cassandra for delete", async () => {
    expect.assertions(1);

    mockExecute.mockImplementation((query) => {
      if (query === queries.deleteKey) return "Cassandra error";
      return cassandraResponse([
        {
          key: "my-key",
          value: "my value",
        },
      ]);
    });

    await callKeyValue
      .delete("/my-key")
      .expect(500)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(InternalError)
        );
      });
  });
});
