const ethers = require("ethers");
const { BadRequestError, NotFoundError } = require("../../src/errors");
const controller = require("../../src/api/controller");
const { maxBlockToParse } = require("../../src/config");

jest.setTimeout(500000);

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
    expect.assertions(1);
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
    expect.assertions(1);
    const result = await controller.getRecord(hash);
    expect(result).toStrictEqual(expectedRecord);
  });

  it("get a too old record", async () => {
    expect.assertions(4);
    // make sure to get an old enough hash
    let size = 0;
    let blockNumbers = [];
    let response = null;
    while (maxBlockToParse >= blockNumbers.length - 1) {
      size += 50;
      // eslint-disable-next-line no-await-in-loop
      response = await controller.getListRecords({ page: { size } });
      blockNumbers = response.items
        .filter((v, i, arr) => {
          if (i === 0) return true;
          return v.blockNumber !== arr[i - 1].blockNumber;
        })
        .map((r) => r.blockNumber);
    }
    const oldHash = response.items.reduce((accumulator, currentValue) => {
      if (accumulator.blockNumber > currentValue.blockNumber)
        return currentValue;
      return accumulator;
    }).hash;
    response = await controller.getRecord(oldHash);
    expect(response).toStrictEqual(expectedRecord);
    expect(response.txHash).toStrictEqual("");
    expect(response.blockNumber).toStrictEqual(0);
    expect(response.timestamp).toStrictEqual("");
  });
  it("malformed hash is rejected", async () => {
    expect.assertions(1);
    const check = async () => {
      await controller.getRecord("this is not a hash");
    };
    await expect(check()).rejects.toThrow(BadRequestError);
  });

  it("random hash is not found", async () => {
    expect.assertions(1);
    const r = Math.random().toString(36);
    const randomHash = ethers.utils.keccak256(Buffer.from(r, "utf8"));
    const check = async () => {
      await controller.getRecord(randomHash);
    };
    await expect(check()).rejects.toThrow(NotFoundError);
  });
});
