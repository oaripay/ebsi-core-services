const supertest = require("supertest");
const cassandraDriver = require("cassandra-driver");
const jose = require("jose");
const crypto = require("crypto");
const fs = require("fs");
const ethers = require("ethers");
const config = require("../../src/config");
const Server = require("../../src/server");

const {
  BadRequestError,
  NotFoundError,
  PayloadTooLargeError,
  InternalServerError,
} = require("../../src/errors");

jest.mock("cassandra-driver");

const server = new Server().getServer();
const request = supertest(server);

let callApi;

const queries = {
  getListFiles: "select id, hash from file_storage",
  getFile: "select * from file_storage where hash = ? allow filtering",
  insertFile:
    "insert into file_storage (id, filename, hash, data) VALUES (now(), ?, ?, ?)",
  deleteFile: "delete from file_storage where id = ? and hash = ?",
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

function createRandomFile(name, size = 1024, writeFile = true) {
  const data = crypto.randomBytes(size);
  const hash = ethers.utils.keccak256(data);
  if (writeFile) fs.writeFileSync(name, data);
  return { data, hash };
}

const mockExecute = jest.spyOn(cassandraDriver.Client.prototype, "execute");

// function to get calls of cassandra.execute in the instance file
function getExecuteCalls() {
  const instanceFile = cassandraDriver.Client.mock.instances[0];
  return instanceFile.execute.mock.calls;
}

describe("file storage tests", () => {
  // eslint-disable-next-line jest/no-hooks
  beforeAll(async () => {
    const token = jose.JWT.sign({ aud: config.API_NAME }, config.privKey);
    const fn = (type) => {
      return (method) => {
        return request[type](`/storage/v1/stores/distributed/files${method}`)
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
    const instanceFile = cassandraDriver.Client.mock.instances[0];
    instanceFile.execute.mock.calls = [];
  });

  it("get list files", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([{ hash: "hash1" }, { hash: "hash2" }]);
    });

    const response = await callApi.get("/");

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: ["hash1", "hash2"],
        total: 2,
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const opts = { prepare: true, fetchSize: 10 };

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getListFiles, [], opts])
    );
  });

  it("get list files and custom page size", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([{ hash: "hash1" }, { hash: "hash2" }]);
    });

    const response = await callApi.get("/?page[size]=11");

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: ["hash1", "hash2"],
        total: 2,
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const opts = { prepare: true, fetchSize: 11 };

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getListFiles, [], opts])
    );
  });

  it("get list files and custom page size and page after", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([{ hash: "hash1" }, { hash: "hash2" }], "efgh");
    });

    const response = await callApi.get("/?page[size]=11&page[after]=abcd");

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: ["hash1", "hash2"],
        total: 2,
        links: {
          first: "/storage/v1/stores/distributed/files?page%5Bsize%5D=11",
          next:
            "/storage/v1/stores/distributed/files?page%5Bsize%5D=11&page%5Bafter%5D=efgh",
        },
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const opts = { prepare: true, fetchSize: 11, pageState: "abcd" };

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getListFiles, [], opts])
    );
  });

  it("get list files and different query", async () => {
    expect.assertions(3);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([{ hash: "hash1" }, { hash: "hash2" }]);
    });

    const response = await callApi.get("/?page[xxx]=11");

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: ["hash1", "hash2"],
        total: 2,
      })
    );
    expect(response.status).toBe(200);

    const [callSearch] = getExecuteCalls();
    const opts = { prepare: true, fetchSize: 10 };

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getListFiles, [], opts])
    );
  });

  it("upload file", async () => {
    expect.assertions(4);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([]);
    });

    const { data, hash } = createRandomFile("test-file.bin");

    const response = await callApi.post("/").attach("file", "test-file.bin");

    expect(response.body).toStrictEqual({
      hash,
      function: "keccak256",
    });
    expect(response.status).toBe(201);

    fs.unlinkSync("test-file.bin");

    const [callSearch, callInsert] = getExecuteCalls();

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getFile, [hash]])
    );
    expect(callInsert).toStrictEqual(
      expect.arrayContaining([
        queries.insertFile,
        ["test-file.bin", hash, data],
      ])
    );
  });

  it("get file", async () => {
    expect.assertions(4);

    const { data, hash } = createRandomFile("test.bin", 20, false);
    const length = `${data.length}`;

    mockExecute.mockImplementation(() => {
      return cassandraResponse([
        {
          filename: "test.bin",
          data,
          hash,
        },
      ]);
    });

    const response = await callApi.get(`/${hash}`).responseType("blob");

    expect(response.body).toStrictEqual(data);
    expect(response.headers).toStrictEqual(
      expect.objectContaining({
        "content-length": `${length}`,
        "content-disposition": "attachment; filename=test.bin",
      })
    );
    expect(response.status).toBe(200);

    const [call] = getExecuteCalls();

    expect(call).toStrictEqual(
      expect.arrayContaining([queries.getFile, [hash]])
    );
  });

  it("delete file", async () => {
    expect.assertions(3);

    const { data, hash } = createRandomFile("test.bin", 20, false);
    const id = "e406c4d3-a184-44f4-8f9d-407e87081dff";
    mockExecute.mockImplementation((query) => {
      switch (query) {
        case queries.getFile:
          return cassandraResponse([
            {
              filename: "test.bin",
              data,
              hash,
              id,
            },
          ]);
        case queries.deleteFile:
          return cassandraResponse([]);
        default:
          throw new Error(`query not expected: ${query}`);
      }
    });

    const response = await callApi.delete(`/${hash}`);

    expect(response.status).toBe(204);

    const [callSearch, callDelete] = getExecuteCalls();

    expect(callSearch).toStrictEqual(
      expect.arrayContaining([queries.getFile, [hash]])
    );
    expect(callDelete).toStrictEqual(
      expect.arrayContaining([queries.deleteFile, [id, hash]])
    );
  });

  /* Test Errors */

  it("error file already exist", async () => {
    expect.assertions(2);

    const { data, hash } = createRandomFile("test-file.bin");

    mockExecute.mockImplementation(() => {
      return cassandraResponse([
        {
          filename: "test-file.bin",
          data,
          hash,
        },
      ]);
    });

    const response = await callApi.post("/").attach("file", "test-file.bin");

    expect(response.body).toBeHTTPError(BadRequestError);
    expect(response.status).toBe(400);

    fs.unlinkSync("test-file.bin");
  });

  it("file not found error", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([]);
    });

    const response = await callApi.get("/my-hash");

    expect(response.body).toBeHTTPError(NotFoundError);
    expect(response.status).toBe(404);
  });

  it("file not found error when deleting", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation(() => {
      return cassandraResponse([]);
    });

    const response = await callApi.delete("/my-hash");

    expect(response.body).toBeHTTPError(NotFoundError);
    expect(response.status).toBe(404);
  });

  it("error too large file", async () => {
    expect.assertions(3);

    createRandomFile("big-file.bin", 16 * 1024 * 1024);

    const response = await callApi.post("/").attach("file", "big-file.bin");

    expect(response.body).toBeHTTPError(PayloadTooLargeError);
    expect(response.status).toBe(413);

    fs.unlinkSync("big-file.bin");

    const calls = getExecuteCalls();
    expect(calls).toHaveLength(0);
  });

  it("bad request error for bad file", async () => {
    expect.assertions(2);

    const response = await callApi
      .post("/")
      .set("Content-Type", "application/json")
      .send("This is not a file");

    expect(response.body).toBeHTTPError(BadRequestError);
    expect(response.status).toBe(400);
  });

  it("bad request error when there is no file to store", async () => {
    expect.assertions(2);

    const response = await callApi
      .post("/")
      .field("my-field", "no file attached");

    expect(response.body).toBeHTTPError(BadRequestError);
    expect(response.status).toBe(400);
  });

  it("internal error in cassandra for search", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      if (query === queries.getListFiles) return "Cassandra error";
      return cassandraResponse([]);
    });

    const response = await callApi.get("/");

    expect(response.body).toBeHTTPError(InternalServerError);
    expect(response.status).toBe(500);
  });

  it("internal error in cassandra for insert", async () => {
    expect.assertions(2);

    mockExecute.mockImplementation((query) => {
      if (query === queries.insertFile) return "Cassandra error";
      return cassandraResponse([]);
    });

    createRandomFile("test-file.bin");
    const response = await callApi.post("/").attach("file", "test-file.bin");

    expect(response.body).toBeHTTPError(InternalServerError);
    expect(response.status).toBe(500);

    fs.unlinkSync("test-file.bin");
  });

  it("internal error in cassandra for delete", async () => {
    expect.assertions(2);

    const { data, hash } = createRandomFile("test-file.bin", 20, false);
    const id = "932729b0-dcb0-4304-a376-5dba15148864";
    mockExecute.mockImplementation((query) => {
      if (query === queries.deleteFile) return "Cassandra error";
      return cassandraResponse([
        {
          filename: "test-file.bin",
          data,
          hash,
          id,
        },
      ]);
    });

    const response = await callApi.delete(`/${hash}`);

    expect(response.body).toBeHTTPError(InternalServerError);
    expect(response.status).toBe(500);
  });
});
