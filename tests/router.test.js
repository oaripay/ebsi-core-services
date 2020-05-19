const ethers = require("ethers");
const supertest = require("supertest");

const server = require("../src/start");

const request = supertest(server);

const callTimestamp = (method) => {
  return request
    .get(`/timestamp/v1/hashes${method}`)
    .set("Accept", "application/json");
};

jest.setTimeout(10000);

describe("timestamp api router tests", () => {
  let hash;
  const expectedRecord = expect.objectContaining({
    hash: expect.any(String),
    txHash: expect.any(String),
    blockNumber: expect.any(Number),
    timestamp: expect.any(String),
    registeredBy: expect.any(String),
  });

  /* eslint jest/no-hooks: "off" */
  afterAll(async () => {
    server.close();
  });

  it("get list of recent records", async () => {
    expect.assertions(1);
    await callTimestamp("/")
      .expect(200)
      .then((response) => {
        const total = response.body.items.length;
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            items: expect.arrayContaining([expectedRecord]),
            total,
          })
        );
        hash = response.body.items[0].hash;
      });
  });

  it("get a record", async () => {
    expect.assertions(1);
    await callTimestamp(`/${hash}`)
      .expect(200)
      .then((response) => {
        expect(response.body).toStrictEqual(expectedRecord);
      });
  });

  it("malformed hash is rejected", async () => {
    expect.assertions(0);
    await callTimestamp("/this-is-not-a-hash").expect(400);
  });

  it("random hash is not found", async () => {
    expect.assertions(0);
    const r = Math.random().toString(36);
    const randomHash = ethers.utils.keccak256(Buffer.from(r, "utf8"));
    await callTimestamp(`/${randomHash}`).expect(404);
  });
});
