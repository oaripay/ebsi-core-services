const supertest = require("supertest");
const { url } = require("../config");

const request = supertest(url);

jest.setTimeout(150000);

const callFabric = (path) => {
  return request
    .get(`/ledger/v1/blockchains/fabric${path}`)
    .set("Accept", "application/json");
};

let txHash;

describe("hyperledger Fabric integration test", () => {
  it("get channels", async () => {
    expect.assertions(2);
    const response = await callFabric("/channels");
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(["ebsichannel"]);
  });

  it("get ebsichannel", async () => {
    expect.assertions(1);
    const response = await callFabric("/channels/ebsichannel");
    expect(response.status).toBe(204);
  });

  it("get blocks", async () => {
    expect.assertions(2);
    const response = await callFabric(
      "/channels/ebsichannel/blocks?pageSize=10"
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([
        expect.objectContaining({
          blockHash: expect.any(String),
          blocknum: expect.any(Number),
          channelName: "ebsichannel",
          createdTime: expect.any(String),
          dataHash: expect.any(String),
          prevHash: expect.any(String),
          txCount: expect.any(Number),
          txHash: expect.arrayContaining([expect.any(String)]),
        }),
      ]),
      links: expect.objectContaining({}),
      pageSize: expect.any(Number),
      total: expect.any(Number),
    });

    const index = response.body.items.findIndex((i) => i.txCount > 0);
    [txHash] = response.body.items[index].txHash;
  });

  it("get block by number", async () => {
    expect.assertions(2);
    const blocknum = 0;
    const response = await callFabric(
      `/channels/ebsichannel/blocks/${blocknum}`
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.objectContaining({
        blockHash: expect.any(String),
        blocknum,
        channelName: "ebsichannel",
        createdTime: expect.any(String),
        dataHash: expect.any(String),
        prevHash: expect.any(String),
        txCount: expect.any(Number),
        txHash: expect.arrayContaining([expect.any(String)]),
      })
    );
  });

  it("get transactions", async () => {
    expect.assertions(2);
    const response = await callFabric(
      "/channels/ebsichannel/transactions?pageSize=10"
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      items: expect.arrayContaining([
        expect.objectContaining({
          chaincodeName: expect.any(String),
          channelName: "ebsichannel",
          createdAT: expect.any(String),
          creatorMspId: expect.any(String),
          endorserMspId: expect.any(String),
          payloadProposalHash: expect.any(String),
          txHash: expect.any(String),
          type: expect.any(String),
          validatioCode: expect.any(String),
        }),
      ]),
      links: expect.objectContaining({}),
      pageSize: expect.any(Number),
      total: expect.any(Number),
    });
  });

  it("get transaction by id", async () => {
    expect.assertions(2);
    const response = await callFabric(
      `/channels/ebsichannel/transactions/${txHash}`
    );
    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chaincodeName: expect.any(String),
          channelName: "ebsichannel",
          createdAT: expect.any(String),
          creatorMspId: expect.any(String),
          endorserMspId: expect.any(String),
          payloadProposalHash: expect.any(String),
          txHash,
          type: expect.any(String),
          validatioCode: expect.any(String),
        }),
      ])
    );
  });
});
