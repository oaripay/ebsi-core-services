const FabricClient = require("fabric-client");
const querystring = require("querystring");

const dataBlock = require("./data-block.json");

jest.spyOn(FabricClient, "loadFromConfig").mockImplementation(() => {
  const client = new FabricClient();
  client.newChannel("ebsichannel");
  return client;
});

const controller = require("../../src/api/fabric/controller");

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
    if (!block) throw new Error("block not found");
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
    if (!block) throw new Error("transaction not found");
    const transaction = {
      validationCode: 0,
      transactionEnvelope: block.data.data[0],
    };
    return transaction;
  });

describe("tests controller hyperledger Fabric", () => {
  it("gets a channel", async () => {
    expect.assertions(1);
    const result = await controller.getChannel("ebsichannel");
    expect(result).toStrictEqual({
      orderers: expect.arrayContaining([]),
      peers: expect.objectContaining({}),
    });
  });

  it("gets a block", async () => {
    expect.assertions(2);
    const result1 = await controller.getBlock("ebsichannel", "4");
    expect(result1).toStrictEqual({
      blocknum: 4,
      channelId: "ebsichannel",
      creatorsMspId: ["EbsiNode1MSP"],
      dataHash: expect.any(String),
      prevHash: expect.any(String),
      timestamp: "2020-05-14T08:26:08.434Z",
      txIds: [expect.any(String)],
    });

    // block without transactions
    const result2 = await controller.getBlock("ebsichannel", "0");
    expect(result2).toStrictEqual({
      blocknum: 0,
      channelId: "ebsichannel",
      creatorsMspId: ["EbsiNode1MSP"],
      dataHash: expect.any(String),
      prevHash: expect.any(String),
      timestamp: null,
      txIds: [],
    });
  });

  it("gets a transaction", async () => {
    expect.assertions(1);
    const b = await controller.getBlock("ebsichannel", "5");
    const result = await controller.getTransaction("ebsichannel", b.txIds[0]);
    expect(result).toStrictEqual({
      validationCode: 0,
      transactionEnvelope: {
        signature: expect.objectContaining({}),
        payload: expect.objectContaining({}),
      },
    });
  });

  it("gets list of channels", async () => {
    expect.assertions(1);
    const result = await controller.getChannels();
    expect(result).toStrictEqual({
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
  });

  it("gets list of blocks", async () => {
    expect.assertions(2);
    const result = await controller.getBlocks("ebsichannel");
    expect(result).toStrictEqual({
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
    const blocknums = result.items.map((b) => b.blocknum);
    expect(blocknums).toStrictEqual([49, 48, 47, 46, 45, 44, 43, 42, 41, 40]);
  });

  it("gets list of transactions", async () => {
    expect.assertions(2);
    const result = await controller.getTransactions("ebsichannel");
    expect(result).toStrictEqual({
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
    const blocknums = result.items.map((tx) => tx.blocknum);
    expect(blocknums).toStrictEqual([49, 48, 47, 46, 45, 44, 43, 42, 41, 40]);
  });

  /* PAGINATION */

  it("gets list of blocks and the next page", async () => {
    expect.assertions(2);
    const first = await controller.getBlocks("ebsichannel");
    const q = querystring.parse(first.links.next.split("?")[1]);
    const query = { page: { after: q["page[after]"] } };
    const result = await controller.getBlocks("ebsichannel", query);

    expect(result).toStrictEqual({
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
    const blocknums = result.items.map((b) => b.blocknum);
    expect(blocknums).toStrictEqual([39, 38, 37, 36, 35, 34, 33, 32, 31, 30]);
  });

  it("gets list of blocks with custom page size", async () => {
    expect.assertions(2);
    const result = await controller.getBlocks("ebsichannel", {
      page: { size: "6" },
    });

    expect(result).toStrictEqual({
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
    const blocknums = result.items.map((b) => b.blocknum);
    expect(blocknums).toStrictEqual([49, 48, 47, 46, 45, 44]);
  });

  it("gets list of blocks with custom page size and page after", async () => {
    expect.assertions(2);
    const result = await controller.getBlocks("ebsichannel", {
      page: { size: "6", after: "21" },
    });

    expect(result).toStrictEqual({
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
    const blocknums = result.items.map((b) => b.blocknum);
    expect(blocknums).toStrictEqual([21, 20, 19, 18, 17, 16]);
  });

  it("gets list of blocks in the last page", async () => {
    expect.assertions(2);
    const result = await controller.getBlocks("ebsichannel", {
      page: { size: "6", after: "3" },
    });

    expect(result).toStrictEqual({
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
    const blocknums = result.items.map((b) => b.blocknum);
    expect(blocknums).toStrictEqual([3, 2, 1, 0]);
  });

  it("gets list of transactions and the next page", async () => {
    expect.assertions(2);
    const first = await controller.getTransactions("ebsichannel");
    const q = querystring.parse(first.links.next.split("?")[1]);
    const query = { page: { after: q["page[after]"] } };
    const result = await controller.getTransactions("ebsichannel", query);
    expect(result).toStrictEqual({
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
    const blocknums = result.items.map((tx) => tx.blocknum);
    expect(blocknums).toStrictEqual([39, 38, 37, 36, 35, 34, 33, 32, 31, 30]);
  });

  it("gets list of transactions with custom page size and page after", async () => {
    expect.assertions(2);
    const result = await controller.getTransactions("ebsichannel", {
      page: {
        size: "6",
        after:
          "21aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa21a",
      },
    });

    expect(result).toStrictEqual({
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
    const blocknums = result.items.map((tx) => tx.blocknum);
    expect(blocknums).toStrictEqual([21, 20, 19, 18, 17, 16]);
  });

  it("gets list of transactions in a block with several transactions", async () => {
    expect.assertions(2);
    const result = await controller.getTransactions("ebsichannel", {
      page: {
        size: "4",
        after:
          "1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb3",
      },
    });

    expect(result).toStrictEqual({
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
    const ids = result.items.map((tx) => tx.txId.replace(/b/g, ""));
    expect(ids).toStrictEqual(["3", "4", "5", "6"]);
  });

  it("gets list of transactions in the last page", async () => {
    expect.assertions(3);
    const result1 = await controller.getTransactions("ebsichannel", {
      page: { size: "20", after: "1" },
    });

    expect(result1).toStrictEqual({
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
    const ids = result1.items.map((tx) => tx.txId.replace(/b/g, ""));
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

    const result2 = await controller.getTransactions("ebsichannel", {
      page: { size: "20", after: "0" },
    });

    expect(result2).toStrictEqual({
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
  });

  /* ERRORS */

  it("throws error for no channel found", async () => {
    expect.assertions(1);
    await expect(controller.getChannel("mychannel")).rejects.toThrow(
      "Channel not found"
    );
  });

  it("throws error for no block found", async () => {
    expect.assertions(2);
    await expect(controller.getBlock("ebsichannel", "1500")).rejects.toThrow(
      "Block not found"
    );

    await expect(
      controller.getBlocks("ebsichannel", { page: { after: "1500" } })
    ).rejects.toThrow("Block not found");
  });

  it("throws error for no transaction found", async () => {
    expect.assertions(2);
    await expect(
      controller.getTransaction("ebsichannel", "abcd")
    ).rejects.toThrow("Transaction not found");

    await expect(
      controller.getTransactions("ebsichannel", { page: { after: "1500" } })
    ).rejects.toThrow("Transaction not found");
  });

  it("throws error for bad page size", async () => {
    expect.assertions(2);
    await expect(
      controller.getBlocks("ebsichannel", { page: { size: "nonumber" } })
    ).rejects.toThrow("Invalid params");

    await expect(
      controller.getBlocks("ebsichannel", { page: { size: "-3" } })
    ).rejects.toThrow("Invalid params");
  });

  it("throws error for bad page after getting blocks", async () => {
    expect.assertions(3);
    await expect(
      controller.getBlocks("ebsichannel", { page: { after: "nonumber" } })
    ).rejects.toThrow("Invalid params");

    await expect(
      controller.getBlocks("ebsichannel", { page: { after: "-3" } })
    ).rejects.toThrow("Invalid params");

    await expect(
      controller.getTransactions("ebsichannel", { page: { after: "nonumber" } })
    ).rejects.toThrow("Invalid params");
  });
});
