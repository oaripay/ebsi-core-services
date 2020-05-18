const ethers = require("ethers");
const { BadRequestError, NotFoundError } = require("../src/errors");
const controller = require("../src/api/controller");

/*
 * Tests
 */

describe("timestamp API Test", () => {
  let hash;
  const expectedRecord = expect.objectContaining({
    hash: expect.any(String),
    txHash: expect.any(String),
    blockNumber: expect.any(Number),
    timestamp: expect.any(String),
    registeredBy: expect.any(String),
  });

  it("get list of recent records", async () => {
    expect.hasAssertions();
    const result = await controller.getListRecords();
    const total = result.items.length;
    expect(result).toStrictEqual(
      expect.objectContaining({
        items: expect.arrayContaining([expectedRecord]),
        total,
      })
    );
    hash = result.items[0].hash;
  });

  it("get a record", async () => {
    expect.hasAssertions();
    const result = await controller.getRecord(hash);
    expect(result).toStrictEqual(expectedRecord);
  });

  it("malformed hash is rejected", async () => {
    expect.hasAssertions();
    const check = async () => {
      await controller.getRecord("this is not a hash");
    };
    await expect(check()).rejects.toThrow(BadRequestError);
  });

  it("random hash is not found", async () => {
    expect.hasAssertions();
    const r = Math.random().toString(36);
    const randomHash = ethers.utils.keccak256(Buffer.from(r, "utf8"));
    const check = async () => {
      await controller.getRecord(randomHash);
    };
    await expect(check()).rejects.toThrow(NotFoundError);
  });
});
