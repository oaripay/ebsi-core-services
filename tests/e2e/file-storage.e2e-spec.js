const supertest = require("supertest");
const { Agent, Scope } = require("@cef-ebsi/app-jwt");
const crypto = require("crypto");
const ethers = require("ethers");
const fs = require("fs");
const Server = require("../../src/server");
const cassandra = require("../../src/cassandraClient");
const { url, TEST_APP_NAME, privKey } = require("../config");
const { BadRequestError, PayloadTooLargeError } = require("../../src/errors");

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

describe("file storage tests", () => {
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

    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  // eslint-disable-next-line jest/no-hooks
  afterAll(async () => {
    await cassandra.shutdown();
  });

  it("create new session", () => {
    expect.assertions(2);

    expect(sessionResponse.body).toStrictEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 900, // 15 minutes
        issuedAt: expect.any(Number),
      })
    );
    expect(sessionResponse.status).toBe(200);
  });

  it("upload, get and delete file", async () => {
    expect.assertions(6);

    const { data, hash } = createRandomFile("test-file.bin");

    const uploadFileResponse = await callApi
      .post("/")
      .attach("file", "test-file.bin");

    expect(uploadFileResponse.body).toStrictEqual({
      hash,
      function: "keccak256",
    });
    expect(uploadFileResponse.status).toBe(201);

    fs.unlinkSync("test-file.bin");

    const getFileResponse = await callApi.get(`/${hash}`).responseType("blob");

    expect(getFileResponse.body).toStrictEqual(data);
    expect(getFileResponse.headers).toStrictEqual(
      expect.objectContaining({
        "content-length": `${data.length}`,
        "content-disposition": "attachment; filename=test-file.bin",
      })
    );
    expect(getFileResponse.status).toBe(200);

    const deleteFileResponse = await callApi.delete(`/${hash}`);

    expect(deleteFileResponse.status).toBe(204);
  });

  it("get list files", async () => {
    expect.assertions(2);

    const response = await callApi.get("/");

    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: expect.arrayContaining([]),
        total: expect.any(Number),
      })
    );
    expect(response.status).toBe(200);
  });

  it("get list files and custom page size and page after", async () => {
    expect.assertions(3);

    // uploading several files
    const uploads = [];
    for (let i = 0; i < 20; i += 1) {
      createRandomFile(`test-file${i}.bin`);
      uploads.push(callApi.post("/").attach("file", `test-file${i}.bin`));
    }

    await Promise.all(uploads);

    const response = await callApi.get("/?page[size]=5");

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
    expect(response.status).toBe(200);

    const urlNext = response.body.links.next;

    // call next page
    const nextResponse = await callApi.get(urlNext);

    expect(nextResponse.status).toBe(200);

    for (let i = 0; i < 20; i += 1) fs.unlinkSync(`test-file${i}.bin`);
  });

  /* Test Errors */

  it("error file already exist", async () => {
    expect.assertions(3);

    const { hash } = createRandomFile("test-file.bin");

    const uploadResponse = await callApi
      .post("/")
      .attach("file", "test-file.bin");

    expect(uploadResponse.body).toStrictEqual({
      hash,
      function: "keccak256",
    });
    expect(uploadResponse.status).toBe(201);

    const secondUploadResponse = await callApi
      .post("/")
      .attach("file", "test-file.bin");

    expect(secondUploadResponse.status).toBe(400);

    fs.unlinkSync("test-file.bin");
  });

  it("file not found error", async () => {
    expect.assertions(1);
    const { hash } = createRandomFile("test-file.bin");
    const response = await callApi.get(`/${hash}`);

    expect(response.status).toBe(404);

    fs.unlinkSync("test-file.bin");
  });

  it("file not found error when deleting", async () => {
    expect.assertions(1);
    const { hash } = createRandomFile("test-file.bin");
    const response = await callApi.delete(`/${hash}`);

    expect(response.status).toBe(404);

    fs.unlinkSync("test-file.bin");
  });

  it("error too large file", async () => {
    expect.assertions(2);

    createRandomFile("big-file.bin", 16 * 1024 * 1024);

    const response = await callApi.post("/").attach("file", "big-file.bin");

    expect(response.body).toBeHTTPError(PayloadTooLargeError);
    expect(response.status).toBe(413);

    fs.unlinkSync("big-file.bin");
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
});
