const supertest = require("supertest");
const FabricClient = require("fabric-client");

const dataBlock = require("./data-block.json");

jest.spyOn(FabricClient, "loadFromConfig").mockImplementation(() => {
  const client = new FabricClient();
  client.newChannel("ebsichannel");
  return client;
});

const Server = require("../../src/server");

const server = new Server().getServer();
const request = supertest(server);

const url = "/ledger/v1/blockchains/fabric/channels";

// Dummy data
/* eslint-disable prefer-spread */
const blocks = Array.apply(null, { length: 50 }).map((block, index) => {
  const bnum = Number(index).toString();
  const b = JSON.parse(JSON.stringify(dataBlock));
  b.data.data[0].payload.header.channel_header.tx_id = `${"a".repeat(
    63 - bnum.length
  )}${bnum}a`;
  b.header.number = bnum;

  if (index === 0) {
    // first block without transactions
    b.data.data = [];
  }

  if (index === 1) {
    // second block with 10 transactions
    b.data.data = Array.apply(null, { length: 10 }).map((transaction, id) => {
      const copyData = JSON.parse(JSON.stringify(dataBlock));
      copyData.data.data[0].payload.header.channel_header.tx_id = `${"b".repeat(
        63
      )}${id}`;
      return copyData.data.data[0];
    });
  }

  return b;
});

jest
  .spyOn(FabricClient.Channel.prototype, "queryInfo")
  .mockImplementation(() => {
    return { height: Number(blocks.length).toString() };
  });

jest
  .spyOn(FabricClient.Channel.prototype, "queryBlock")
  .mockImplementation((blocknum) => {
    const block = blocks.find((b) => Number(b.header.number) === blocknum);
    if (!block) throw new Error("internal message for block not found");
    return block;
  });

jest
  .spyOn(FabricClient.Channel.prototype, "queryTransaction")
  .mockImplementation((txId) => {
    const block = blocks.find((b) => {
      return !!b.data.data.find((data) => {
        return data.payload.header.channel_header.tx_id === txId;
      });
    });
    if (!block) throw new Error("internal message for transaction not found");
    const transaction = {
      validationCode: 0,
      transactionEnvelope: block.data.data[0],
    };
    return transaction;
  });

describe("tests Hyperledger Fabric api", () => {
  it("gets a channel", async () => {
    expect.assertions(2);
    const response = await request.get(`${url}/ebsichannel`);
    expect(response.body).toStrictEqual({});
    expect(response.status).toBe(204);
  });

  it("gets a block", async () => {
    expect.assertions(4);
    const response1 = await request.get(`${url}/ebsichannel/blocks/4`);
    expect(response1.body).toStrictEqual({
      blocknum: 4,
      channelId: "ebsichannel",
      creatorsMspId: ["EbsiNode1MSP"],
      dataHash: expect.any(String),
      prevHash: expect.any(String),
      timestamp: "2020-05-14T08:26:08.434Z",
      txIds: [expect.any(String)],
    });
    expect(response1.status).toBe(200);

    // block without transactions
    const response2 = await request.get(`${url}/ebsichannel/blocks/0`);
    expect(response2.body).toStrictEqual({
      blocknum: 0,
      channelId: "ebsichannel",
      creatorsMspId: ["EbsiNode1MSP"],
      dataHash: expect.any(String),
      prevHash: expect.any(String),
      timestamp: null,
      txIds: [],
    });
    expect(response2.status).toBe(200);
  });

  it("gets a transaction", async () => {
    expect.assertions(2);
    const responseBlock = await request.get(`${url}/ebsichannel/blocks/5`);
    const b = responseBlock.body;
    const response = await request.get(
      `${url}/ebsichannel/transactions/${b.txIds[0]}`
    );
    expect(response.body).toStrictEqual({
      validationCode: 0,
      transactionEnvelope: {
        signature: expect.objectContaining({}),
        payload: expect.objectContaining({}),
      },
    });
    expect(response.status).toBe(200);
  });

  it("gets list of channels", async () => {
    expect.assertions(2);
    const response = await request.get(`${url}/`);
    expect(response.body).toStrictEqual({
      items: ["ebsichannel"],
      links: {
        first: "/ledger/v1/blockchains/fabric/channels/?page%5Bafter%5D=0",
        last: "/ledger/v1/blockchains/fabric/channels/?page%5Bafter%5D=0",
        next: "/ledger/v1/blockchains/fabric/channels/?page%5Bafter%5D=0",
        prev: "/ledger/v1/blockchains/fabric/channels/?page%5Bafter%5D=0",
      },
      pageSize: 10,
      total: 1,
    });
    expect(response.status).toBe(200);
  });

  it("gets list of blocks", async () => {
    expect.assertions(3);
    const response = await request.get(`${url}/ebsichannel/blocks`);
    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bafter%5D=49",
        last:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bafter%5D=9",
        next:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bafter%5D=39",
        prev:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bafter%5D=49",
      },
      pageSize: 10,
      total: 50,
    });
    expect(response.status).toBe(200);

    const blocknums = response.body.items.map((b) => b.blocknum);
    expect(blocknums).toStrictEqual([49, 48, 47, 46, 45, 44, 43, 42, 41, 40]);
  });

  it("gets list of transactions", async () => {
    expect.assertions(3);
    const response = await request.get(`${url}/ebsichannel/transactions`);
    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([
        {
          txId: expect.any(String),
          type: "ENDORSER_TRANSACTION",
          timestamp: "2020-05-14T08:26:08.434Z",
          channelId: "ebsichannel",
          creatorMspId: "EbsiNode1MSP",
          blocknum: expect.any(Number),
          actions: expect.arrayContaining([]),
        },
      ]),
      links: {
        first:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bafter%5D=49",
        next:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bafter%5D=39aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa39a",
      },
      pageSize: 10,
      total: 50,
    });
    expect(response.status).toBe(200);

    const blocknums = response.body.items.map((tx) => tx.blocknum);
    expect(blocknums).toStrictEqual([49, 48, 47, 46, 45, 44, 43, 42, 41, 40]);
  });

  /* PAGINATION */

  it("gets list of blocks and the next page", async () => {
    expect.assertions(3);
    const first = await request.get(`${url}/ebsichannel/blocks`);
    const response = await request.get(first.body.links.next);

    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bafter%5D=49",
        last:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bafter%5D=9",
        next:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bafter%5D=29",
        prev:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bafter%5D=49",
      },
      pageSize: 10,
      total: 50,
    });
    expect(response.status).toBe(200);

    const blocknums = response.body.items.map((b) => b.blocknum);
    expect(blocknums).toStrictEqual([39, 38, 37, 36, 35, 34, 33, 32, 31, 30]);
  });

  it("gets list of blocks with custom page size", async () => {
    expect.assertions(3);
    const response = await request.get(
      `${url}/ebsichannel/blocks?page%5Bsize%5D=6`
    );

    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=49",
        last:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=5",
        next:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=43",
        prev:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=49",
      },
      pageSize: 6,
      total: 50,
    });
    expect(response.status).toBe(200);

    const blocknums = response.body.items.map((b) => b.blocknum);
    expect(blocknums).toStrictEqual([49, 48, 47, 46, 45, 44]);
  });

  it("gets list of blocks with custom page size and page after", async () => {
    expect.assertions(3);
    const response = await request.get(
      `${url}/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=21`
    );

    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=49",
        last:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=5",
        next:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=15",
        prev:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=27",
      },
      pageSize: 6,
      total: 50,
    });
    expect(response.status).toBe(200);

    const blocknums = response.body.items.map((b) => b.blocknum);
    expect(blocknums).toStrictEqual([21, 20, 19, 18, 17, 16]);
  });

  it("gets list of blocks in the last page", async () => {
    expect.assertions(3);
    const response = await request.get(
      `${url}/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=3`
    );

    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=49",
        last:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=5",
        next:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=0",
        prev:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=9",
      },
      pageSize: 6,
      total: 50,
    });
    expect(response.status).toBe(200);

    const blocknums = response.body.items.map((b) => b.blocknum);
    expect(blocknums).toStrictEqual([3, 2, 1, 0]);
  });

  it("gets list of transactions and the next page", async () => {
    expect.assertions(3);
    const first = await request.get(`${url}/ebsichannel/transactions`);
    const response = await request.get(first.body.links.next);
    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bafter%5D=49",
        next:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bafter%5D=29aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa29a",
      },
      pageSize: 10,
      total: 50,
    });
    expect(response.status).toBe(200);

    const blocknums = response.body.items.map((tx) => tx.blocknum);
    expect(blocknums).toStrictEqual([39, 38, 37, 36, 35, 34, 33, 32, 31, 30]);
  });

  it("gets list of transactions with custom page size and page after", async () => {
    expect.assertions(3);
    const response = await request.get(
      `${url}/ebsichannel/transactions?page%5Bsize%5D=6&page%5Bafter%5D=21aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa21a`
    );

    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bsize%5D=6&page%5Bafter%5D=49",
        next:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bsize%5D=6&page%5Bafter%5D=15aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa15a",
      },
      pageSize: 6,
      total: 50,
    });
    expect(response.status).toBe(200);

    const blocknums = response.body.items.map((tx) => tx.blocknum);
    expect(blocknums).toStrictEqual([21, 20, 19, 18, 17, 16]);
  });

  it("gets list of transactions in a block with several transactions", async () => {
    expect.assertions(3);
    const response = await request.get(
      `${url}/ebsichannel/transactions?page%5Bsize%5D=4&page%5Bafter%5D=1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb3`
    );

    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bsize%5D=4&page%5Bafter%5D=49",
        next:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bsize%5D=4&page%5Bafter%5D=1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb7",
      },
      pageSize: 4,
      total: 50,
    });
    expect(response.status).toBe(200);

    const ids = response.body.items.map((tx) => tx.txId.replace(/b/g, ""));
    expect(ids).toStrictEqual(["3", "4", "5", "6"]);
  });

  it("gets list of transactions in the last page", async () => {
    expect.assertions(5);
    const response1 = await request.get(
      `${url}/ebsichannel/transactions?page%5Bsize%5D=20&page%5Bafter%5D=1`
    );

    expect(response1.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bsize%5D=20&page%5Bafter%5D=49",
        last:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bsize%5D=20&page%5Bafter%5D=1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb0",
      },
      pageSize: 20,
      total: 50,
    });
    expect(response1.status).toBe(200);

    const ids = response1.body.items.map((tx) => tx.txId.replace(/b/g, ""));
    expect(ids).toStrictEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);

    const response2 = await request.get(
      `${url}/ebsichannel/transactions?page%5Bsize%5D=20&page%5Bafter%5D=0`
    );

    expect(response2.body).toStrictEqual({
      items: [],
      links: {
        first:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bsize%5D=20&page%5Bafter%5D=49",
        last:
          "/ledger/v1/blockchains/fabric/channels/ebsichannel/transactions?page%5Bsize%5D=20&page%5Bafter%5D=0",
      },
      pageSize: 20,
      total: 50,
    });
    expect(response2.status).toBe(200);
  });

  /* ERRORS */

  it("throws error for no channel found", async () => {
    expect.assertions(2);
    const response = await request.get(`${url}/mychannel`);
    expect(response.body).toStrictEqual({
      status: 404,
      title: "Channel not found",
      detail: "Channel 'mychannel' not found",
      type: "about:blank",
    });
    expect(response.status).toBe(404);
  });

  it("throws error for no block found", async () => {
    expect.assertions(4);
    const response1 = await request.get(`${url}/ebsichannel/blocks/1500`);
    expect(response1.body).toStrictEqual({
      status: 404,
      title: "Block not found",
      detail: "internal message for block not found",
      type: "about:blank",
    });
    expect(response1.status).toBe(404);

    const response2 = await request.get(
      `${url}/ebsichannel/blocks?page%5Bafter%5D=1500`
    );
    expect(response2.body).toStrictEqual({
      status: 404,
      title: "Block not found",
      detail: "internal message for block not found",
      type: "about:blank",
    });
    expect(response2.status).toBe(404);
  });

  it("throws error for no transaction found", async () => {
    expect.assertions(4);
    const response1 = await request.get(`${url}/ebsichannel/transactions/abcd`);
    expect(response1.body).toStrictEqual({
      status: 404,
      title: "Transaction not found",
      detail: "internal message for transaction not found",
      type: "about:blank",
    });
    expect(response1.status).toBe(404);

    const response2 = await request.get(
      `${url}/ebsichannel/transactions?page%5Bafter%5D=1500`
    );
    expect(response2.body).toStrictEqual({
      status: 404,
      title: "Transaction not found",
      detail: "internal message for block not found",
      type: "about:blank",
    });
    expect(response2.status).toBe(404);
  });

  it("throws error for bad page size", async () => {
    expect.assertions(6);
    const response1 = await request.get(
      `${url}/ebsichannel/blocks?page%5Bsize%5D=nonumber`
    );
    expect(response1.body).toStrictEqual({
      status: 400,
      title: "Invalid params",
      detail:
        "page[size] must be an integer greater than 0. Received: nonumber",
      type: "about:blank",
    });
    expect(response1.status).toBe(400);

    const response2 = await request.get(
      `${url}/ebsichannel/blocks?page%5Bsize%5D=-3`
    );
    expect(response2.body).toStrictEqual({
      status: 400,
      title: "Invalid params",
      detail: "page[size] must be an integer greater than 0. Received: -3",
      type: "about:blank",
    });
    expect(response2.status).toBe(400);

    const response3 = await request.get(`${url}?page%5Bsize%5D=-3`);
    expect(response3.body).toStrictEqual({
      status: 400,
      title: "Invalid params",
      detail: "page[size] must be an integer greater than 0. Received: -3",
      type: "about:blank",
    });
    expect(response3.status).toBe(400);
  });

  it("throws error for bad page after getting blocks", async () => {
    expect.assertions(6);
    const response1 = await request.get(
      `${url}/ebsichannel/blocks?page%5Bafter%5D=nonumber`
    );
    expect(response1.body).toStrictEqual({
      status: 400,
      title: "Invalid params",
      detail:
        "page[after] must contain a blockNumber greater or equal to 0. Received: nonumber",
      type: "about:blank",
    });
    expect(response1.status).toBe(400);

    const response2 = await request.get(
      `${url}/ebsichannel/blocks?page%5Bafter%5D=-3`
    );
    expect(response2.body).toStrictEqual({
      status: 400,
      title: "Invalid params",
      detail:
        "page[after] must contain a blockNumber greater or equal to 0. Received: -3",
      type: "about:blank",
    });
    expect(response2.status).toBe(400);

    const response3 = await request.get(
      `${url}/ebsichannel/transactions?page%5Bafter%5D=nonumber`
    );
    expect(response3.body).toStrictEqual({
      status: 400,
      title: "Invalid params",
      detail:
        "page[after] must contain a blockNumber greater or equal to 0. Received: nonumber",
      type: "about:blank",
    });
    expect(response3.status).toBe(400);
  });
});
