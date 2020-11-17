const supertest = require("supertest");
const urlApi = require("../config").url;
const Server = require("../../src/server");

let request;
let server = null;
if (urlApi) {
  request = supertest(urlApi);
} else {
  server = new Server().getServer();
  request = supertest(server);
}

const url = "/ledger/v1/blockchains/fabric/channels";

jest.setTimeout(10000);

describe("integration tests Hyperledger Fabric api", () => {
  it("gets a channel", async () => {
    expect.assertions(2);
    const response = await request.get(`${url}/ebsichannel`);
    expect(response.body).toStrictEqual({});
    expect(response.status).toBe(204);
  });

  it("gets a block", async () => {
    expect.assertions(2);
    const response = await request.get(`${url}/ebsichannel/blocks/0`);
    expect(response.body).toStrictEqual({
      blocknum: 0,
      channelId: "ebsichannel",
      creatorsMspId: expect.arrayContaining([]),
      dataHash: expect.any(String),
      prevHash: expect.any(String),
      timestamp: expect.any(String),
      txIds: [expect.any(String)],
    });
    expect(response.status).toBe(200);
  });

  it("gets a transaction", async () => {
    expect.assertions(2);
    const responseTxs = await request.get(`${url}/ebsichannel/transactions`);
    const { txId } = responseTxs.body.items[0];
    const response = await request.get(
      `${url}/ebsichannel/transactions/${txId}`
    );
    expect(response.body).toStrictEqual({
      validationCode: expect.any(Number),
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
        first: expect.any(String),
        last: expect.any(String),
        next: expect.any(String),
        prev: expect.any(String),
      },
      pageSize: 10,
      total: expect.any(Number),
    });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(10);
  });

  it("gets list of transactions", async () => {
    expect.assertions(3);
    const response = await request.get(`${url}/ebsichannel/transactions`);
    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([
        expect.objectContaining({
          txId: expect.any(String),
          type: expect.any(String),
          timestamp: expect.any(String),
          channelId: "ebsichannel",
          creatorMspId: expect.any(String),
          blocknum: expect.any(Number),
        }),
      ]),
      links: {
        first: expect.any(String),
        next: expect.any(String),
      },
      pageSize: 10,
      total: expect.any(Number),
    });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(10);
  });

  /* PAGINATION */

  it("gets list of blocks and the next page", async () => {
    expect.assertions(3);
    const first = await request.get(`${url}/ebsichannel/blocks`);
    const response = await request.get(first.body.links.next);

    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first: expect.any(String),
        last: expect.any(String),
        next: expect.any(String),
        prev: expect.any(String),
      },
      pageSize: 10,
      total: expect.any(Number),
    });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(10);
  });

  it("gets list of blocks with custom page size", async () => {
    expect.assertions(3);
    const response = await request.get(
      `${url}/ebsichannel/blocks?page%5Bsize%5D=6`
    );

    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first: expect.any(String),
        last: expect.any(String),
        next: expect.any(String),
        prev: expect.any(String),
      },
      pageSize: 6,
      total: expect.any(Number),
    });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(6);
  });

  it("gets list of blocks with custom page size and page after", async () => {
    expect.assertions(3);
    const response = await request.get(
      `${url}/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=21`
    );

    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first: expect.any(String),
        last: expect.any(String),
        next: expect.any(String),
        prev: expect.any(String),
      },
      pageSize: 6,
      total: expect.any(Number),
    });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(6);
  });

  it("gets list of blocks in the last page", async () => {
    expect.assertions(3);
    const response = await request.get(
      `${url}/ebsichannel/blocks?page%5Bsize%5D=6&page%5Bafter%5D=3`
    );

    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first: expect.any(String),
        last: expect.any(String),
        next: expect.any(String),
        prev: expect.any(String),
      },
      pageSize: 6,
      total: expect.any(Number),
    });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(4);
  });

  it("gets list of transactions and the next page", async () => {
    expect.assertions(3);
    const first = await request.get(`${url}/ebsichannel/transactions`);
    const response = await request.get(first.body.links.next);
    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first: expect.any(String),
        next: expect.any(String),
      },
      pageSize: 10,
      total: expect.any(Number),
    });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(10);
  });

  it("gets list of transactions with custom page size and page after", async () => {
    expect.assertions(3);
    const response = await request.get(
      `${url}/ebsichannel/transactions?page%5Bsize%5D=6&page%5Bafter%5D=21`
    );

    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first: expect.any(String),
        next: expect.any(String),
      },
      pageSize: 6,
      total: expect.any(Number),
    });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(6);
  });

  it("gets list of transactions in the last page", async () => {
    expect.assertions(2);
    const response1 = await request.get(
      `${url}/ebsichannel/transactions?page%5Bsize%5D=20&page%5Bafter%5D=1`
    );

    expect(response1.body).toStrictEqual({
      items: expect.arrayContaining([]),
      links: {
        first: expect.any(String),
        last: expect.any(String),
      },
      pageSize: 20,
      total: expect.any(Number),
    });
    expect(response1.status).toBe(200);
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
    const response1 = await request.get(
      `${url}/ebsichannel/blocks/150000000000`
    );
    expect(response1.body).toStrictEqual({
      status: 404,
      title: "Block not found",
      detail: expect.any(String),
      type: "about:blank",
    });
    expect(response1.status).toBe(404);

    const response2 = await request.get(
      `${url}/ebsichannel/blocks?page%5Bafter%5D=150000000000`
    );
    expect(response2.body).toStrictEqual({
      status: 404,
      title: "Block not found",
      detail: expect.any(String),
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
      detail: expect.any(String),
      type: "about:blank",
    });
    expect(response1.status).toBe(404);

    const response2 = await request.get(
      `${url}/ebsichannel/transactions?page%5Bafter%5D=150000000000`
    );
    expect(response2.body).toStrictEqual({
      status: 404,
      title: "Transaction not found",
      detail: expect.any(String),
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
