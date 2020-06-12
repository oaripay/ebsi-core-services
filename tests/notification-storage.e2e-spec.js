const axios = require("axios");
const ebsiAppJwt = require("@cef-ebsi/app-jwt").default;
const ethers = require("ethers");

const configTest = require("./config");

const { url, TEST_APP_NAME, privKey } = configTest;
const apiNotif = `${url}/storage/v1/stores/distributed/notifications`;

const sender1 = ethers.Wallet.createRandom().address;
const sender2 = ethers.Wallet.createRandom().address;
const receiver1 = ethers.Wallet.createRandom().address;
const receiver2 = ethers.Wallet.createRandom().address;

const message11 = { msg: "Message from 1 to 1" };
const message12 = { msg: "Message from 1 to 2" };
const message21 = { msg: "Message from 2 to 1" };
const message22 = { msg: "Message from 2 to 2" };

const notification11 = {
  sender: sender1,
  receiver: receiver1,
  message: message11,
};
const notification12 = {
  sender: sender1,
  receiver: receiver2,
  message: message12,
};
const notification21 = {
  sender: sender2,
  receiver: receiver1,
  message: message21,
};
const notification22 = {
  sender: sender2,
  receiver: receiver2,
  message: message22,
};

let id11;
let id12;
let id21;
let id22;

// axios: don't throw error for status >= 400
axios.defaults.validateStatus = () => {
  return true;
};
let axiosAuth;

/*
 * Tests
 */

describe("notification storage tests", () => {
  it("create a new session with storage API", async () => {
    expect.assertions(2);
    const agent = new ebsiAppJwt.Agent(TEST_APP_NAME, privKey);
    const requestToken = agent.createRequestPayload("ebsi-storage");

    const response = await axios.post(
      `${url}/storage/v1/sessions`,
      requestToken
    );
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 900, // 15 minutes
        issuedAt: expect.any(Number),
      })
    );
    const token = response.data.accessToken;
    axiosAuth = axios.create({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  });

  it("create notification", async () => {
    expect.assertions(1);
    const response = await axiosAuth.put(apiNotif, notification11);
    expect(response.status).toBe(200);
    id11 = response.data.id;
  });

  it("get notification", async () => {
    expect.assertions(2);
    const response = await axiosAuth.get(`${apiNotif}/${id11}`);
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual(
      expect.objectContaining(notification11)
    );
  });

  it("update notification", async () => {
    expect.assertions(3);
    const notification = {
      sender: sender1,
      receiver: receiver1,
      message: { msg: "message updated" },
    };
    const response = await axiosAuth.put(`${apiNotif}/${id11}`, notification);
    expect(response.status).toBe(201);
    const responseRead = await axiosAuth.get(`${apiNotif}/${id11}`);
    expect(responseRead.status).toBe(200);
    expect(responseRead.data).toStrictEqual(
      expect.objectContaining(notification)
    );
  });

  it("delete notification", async () => {
    expect.assertions(1);
    const response = await axiosAuth.delete(`${apiNotif}/${id11}`);
    expect(response.status).toBe(204);
  });

  it("get queue for senders and receivers", async () => {
    expect.assertions(8);

    const response11 = await axiosAuth.put(apiNotif, notification11);
    const response12 = await axiosAuth.put(apiNotif, notification12);
    const response21 = await axiosAuth.put(apiNotif, notification21);
    const response22 = await axiosAuth.put(apiNotif, notification22);

    id11 = response11.data.id;
    id12 = response12.data.id;
    id21 = response21.data.id;
    id22 = response22.data.id;

    const responseQueue1 = await axiosAuth.get(
      `${apiNotif}?receiver=${receiver1}`
    );
    expect(responseQueue1.status).toBe(200);
    expect(responseQueue1.data).toStrictEqual(
      expect.objectContaining({
        total: 2,
        items: expect.arrayContaining([
          { ...notification11, id: id11 },
          { ...notification21, id: id21 },
        ]),
        links: expect.objectContaining({}),
      })
    );

    const responseQueue2 = await axiosAuth.get(
      `${apiNotif}?receiver=${receiver2}`
    );
    expect(responseQueue2.status).toBe(200);
    expect(responseQueue2.data).toStrictEqual(
      expect.objectContaining({
        total: 2,
        items: expect.arrayContaining([
          { ...notification12, id: id12 },
          { ...notification22, id: id22 },
        ]),
      })
    );

    const responseDel11 = await axiosAuth.delete(`${apiNotif}/${id11}`);
    expect(responseDel11.status).toBe(204);
    const responseDel12 = await axiosAuth.delete(`${apiNotif}/${id12}`);
    expect(responseDel12.status).toBe(204);
    const responseDel21 = await axiosAuth.delete(`${apiNotif}/${id21}`);
    expect(responseDel21.status).toBe(204);
    const responseDel22 = await axiosAuth.delete(`${apiNotif}/${id22}`);
    expect(responseDel22.status).toBe(204);
  });

  it("get history", async () => {
    expect.assertions(2);

    const response = await axiosAuth.get(
      `${apiNotif}?receiver=${receiver1}&history=true`
    );
    expect(response.status).toBe(200);

    // remove "created" and "deleted" fields in the list
    const { data } = response;
    /* eslint-disable no-param-reassign */
    data.items.forEach((item) => {
      delete item.created;
      delete item.deleted;
    });
    /* eslint-enable no-param-reassign */

    expect(data).toStrictEqual(
      expect.objectContaining({
        total: 3,
        items: expect.arrayContaining([
          { ...notification11, id: expect.any(String) },
          { ...notification21, id: expect.any(String) },
        ]),
      })
    );
  });

  it("get notifications using pagination", async () => {
    expect.assertions(16);

    // several notifications sent to the same receiver
    const receiver = ethers.Wallet.createRandom().address;
    const promises = [];
    for (let i = 0; i < 12; i += 1) {
      const notification = {
        sender: ethers.Wallet.createRandom().address,
        receiver,
        message: { msg: `message ${i}` },
      };
      promises.push(axiosAuth.put(apiNotif, notification));
    }
    const responses = await Promise.all(promises);
    for (let i = 0; i < responses.length; i += 1) {
      expect(responses[i].status).toBe(200);
    }

    // call the first page of results (10)
    const response = await axiosAuth.get(`${apiNotif}?receiver=${receiver}`);
    expect(response.status).toBe(200);
    expect(response.data).toStrictEqual(
      expect.objectContaining({
        total: 10,
        links: {
          first: `/storage/v1/stores/distributed/notifications?receiver=${receiver}`,
          next: expect.stringContaining(
            `/storage/v1/stores/distributed/notifications?receiver=${receiver}&page%5Bafter%5D=`
          ),
        },
      })
    );

    // call the next page of results (2)
    const { next } = response.data.links;
    const responseNext = await axiosAuth.get(url + next);
    expect(responseNext.status).toBe(200);
    expect(responseNext.data).toStrictEqual(
      expect.objectContaining({
        total: 2,
        links: {
          first: `/storage/v1/stores/distributed/notifications?receiver=${receiver}`,
          last: expect.stringContaining(
            `/storage/v1/stores/distributed/notifications?receiver=${receiver}&page%5Bafter%5D=`
          ),
        },
      })
    );
  });
});
