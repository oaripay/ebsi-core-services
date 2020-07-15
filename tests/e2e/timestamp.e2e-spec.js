const ethers = require("ethers");
const supertest = require("supertest");

const { url } = require("../config");

const request = supertest(url);

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
    hash = response.body.items[0].hash;
  });

  it("get a record", async () => {
    expect.assertions(2);
    const response = await callTimestamp(`/${hash}`);
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(expectedRecord);
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
});
