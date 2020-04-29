const ethers = require("ethers");
const axios = require("axios");

const configTest = require("./config");

const { api } = configTest;
const apiTimestamp = `${api}/hashes`;

// axios: don't throw error for status >= 400
axios.defaults.validateStatus = () => {
  return true;
};
axios.defaults.baseURL = apiTimestamp;

/*
 * Tests
 */

describe("timestamp api integration tests", () => {
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
    const response = await axios.get();
    expect(response.status).toBe(200);
    const total = response.data.items.length;
    expect(response.data).toStrictEqual(
      expect.objectContaining({
        items: expect.arrayContaining([expectedRecord]),
        total,
      })
    );
    hash = response.data.items[0].hash;
  });

  it("get a record", async () => {
    expect.assertions(2);
    const response = await axios.get(`/${hash}`);
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual(expectedRecord);
  });

  it("malformed hash is rejected", async () => {
    expect.assertions(1);
    const response = await axios.get("this-is-not-a-hash");
    expect(response.status).toBe(400);
  });

  it("random hash is not found", async () => {
    expect.assertions(1);
    const r = Math.random().toString(36);
    const randomHash = ethers.utils.keccak256(Buffer.from(r, "utf8"));
    const response = await axios.get(randomHash);
    expect(response.status).toBe(404);
  });
});
