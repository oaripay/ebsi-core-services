const ethers = require("ethers");
const supertest = require("supertest");

const Server = require("../../src/server");

const server = new Server().getServer();
const request = supertest(server);

jest.setTimeout(10000);

const callTimestamp = (method) => {
  return request
    .get(`/timestamp/v1/hashes${method}`)
    .set("Accept", "application/json");
};

describe("timestamp api router tests", () => {
  let hash;
  const expectedRecord = expect.objectContaining({
    hash: expect.any(String),
    txHash: expect.any(String),
    blockNumber: expect.any(Number),
    timestamp: expect.any(String),
    registeredBy: expect.any(String),
  });

  it("get list of recent records", async () => {
    expect.assertions(2);
    const response = await callTimestamp("/");
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: expect.arrayContaining([expectedRecord]),
        total: expect.any(Number),
      })
    );
    hash = response.body.items[1].hash;
  });

  it("get a record", async () => {
    expect.assertions(2);
    const response = await callTimestamp(`/${hash}`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(expectedRecord);
  });

  it("should not be case sensitive", async () => {
    expect.assertions(4);
    const response1 = await callTimestamp(`/${hash.toLowerCase()}`);
    expect(response1.status).toBe(200);
    expect(response1.body).toStrictEqual(expectedRecord);

    const response2 = await callTimestamp(`/${hash.toUpperCase()}`);
    expect(response2.status).toBe(200);
    expect(response2.body).toStrictEqual(expectedRecord);
  });

  it("get list of recent records with different page size", async () => {
    expect.assertions(3);
    const response = await callTimestamp("?page[size]=4");
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        items: expect.arrayContaining([expectedRecord]),
        total: expect.any(Number),
      })
    );
    expect(response.body.items).toHaveLength(4);
  });

  it("malformed hash is rejected", async () => {
    expect.assertions(1);
    const response = await callTimestamp("/this-is-not-a-hash");
    expect(response.status).toBe(400);
  });

  it("random hash is not found", async () => {
    expect.assertions(1);
    const r = Math.random().toString(36);
    const randomHash = ethers.utils.keccak256(Buffer.from(r, "utf8"));
    const response = await callTimestamp(`/${randomHash}`);
    expect(response.status).toBe(404);
  });

  it("rejects a bad method", async () => {
    expect.assertions(1);
    const response = await request.get("/timestamp/v1/bad-method");
    expect(response.status).toBe(400);
  });
});
