const supertest = require("supertest");
const ebsiAppJwt = require("@cef-ebsi/app-jwt").default;
const crypto = require("crypto");
const ethers = require("ethers");
const fs = require("fs");

const Server = require("../../src/server");
const cassandra = require("../../src/cassandraClient");
const { url, TEST_APP_NAME, privKey } = require("../config");

const { BadRequestError, TooLargeError } = require("../../src/errors");

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

function createRandomFile(name, size = 1024, writeFile = true) {
  const data = crypto.randomBytes(size);
  const hash = ethers.utils.keccak256(data);
  if (writeFile) fs.writeFileSync(name, data);
  return { data, hash };
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
describe("file storage tests", () => {
  afterAll(async () => {
    await cassandra.shutdown();
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
        else fullPath = `/storage/v1/stores/distributed/files${path}`;

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

  it("upload, get and delete file", async () => {
    expect.assertions(2);

    const { data, hash } = createRandomFile("test-file.bin");

    await callApi
      .post("/")
      .attach("file", "test-file.bin")
      .expect(201)
      .then((response) => {
        expect(response.body).toStrictEqual({
          hash,
          function: "keccak256",
        });
      });

    fs.unlinkSync("test-file.bin");

    await callApi
      .get(`/${hash}`)
      .expect(200)
      .expect("Content-Length", `${data.length}`)
      .expect("Content-Disposition", "attachment; filename=test-file.bin")
      .responseType("blob")
      .then((response) => {
        expect(response.body).toStrictEqual(data);
      });

    await callApi.delete(`/${hash}`).expect(204);
  });

  it("get list files", async () => {
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

  it("get list files and custom page size and page after", async () => {
    expect.assertions(1);

    // uploading several files
    const uploads = [];
    for (let i = 0; i < 20; i += 1) {
      createRandomFile(`test-file${i}.bin`);
      uploads.push(callApi.post("/").attach("file", `test-file${i}.bin`));
    }
    await Promise.all(uploads);

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
              first: "/storage/v1/stores/distributed/files?page%5Bsize%5D=5",
              next: expect.stringContaining(
                "/storage/v1/stores/distributed/files?page%5Bsize%5D=5&page%5Bafter%5D="
              ),
            },
          })
        );
        urlNext = response.body.links.next;
      });

    // call next page
    await callApi.get(urlNext).expect(200);

    for (let i = 0; i < 20; i += 1) fs.unlinkSync(`test-file${i}.bin`);
  });

  /* Test Errors */

  it("error file already exist", async () => {
    expect.assertions(1);

    const { hash } = createRandomFile("test-file.bin");

    await callApi
      .post("/")
      .attach("file", "test-file.bin")
      .expect(201)
      .then((response) => {
        expect(response.body).toStrictEqual({
          hash,
          function: "keccak256",
        });
      });

    await callApi.post("/").attach("file", "test-file.bin").expect(400);

    fs.unlinkSync("test-file.bin");
  });

  it("file not found error", async () => {
    expect.assertions(0);
    const { hash } = createRandomFile("test-file.bin");
    await callApi.get(`/${hash}`).expect(404);
    fs.unlinkSync("test-file.bin");
  });

  it("file not found error when deleting", async () => {
    expect.assertions(0);
    const { hash } = createRandomFile("test-file.bin");
    await callApi.delete(`/${hash}`).expect(404);
    fs.unlinkSync("test-file.bin");
  });

  it("error too large file", async () => {
    expect.assertions(1);

    createRandomFile("big-file.bin", 16 * 1024 * 1024);

    await callApi
      .post("/")
      .attach("file", "big-file.bin")
      .expect(413)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(TooLargeError)
        );
      });

    fs.unlinkSync("big-file.bin");
  });

  it("bad request error for bad file", async () => {
    expect.assertions(1);

    await callApi
      .post("/")
      .set("Content-Type", "application/json")
      .send("This is not a file")
      .expect(400)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(BadRequestError)
        );
      });
  });

  it("bad request error when there is no file to store", async () => {
    expect.assertions(1);

    await callApi
      .post("/")
      .field("my-field", "no file attached")
      .expect(400)
      .then((response) => {
        expect(response.body).toStrictEqual(
          expect.toBeHTTPError(BadRequestError)
        );
      });
  });
});
