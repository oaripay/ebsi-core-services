const axios = require("axios");
const ebsiAppJwt = require("@cef-ebsi/app-jwt").default;

const config = require("../src/config");
const configTest = require("./config");

const { url, TEST_APP_NAME, privKey } = configTest;
const apiKeyValue = `${url}/storage/v1/stores/distributed/key-values`;

const key = `test-${Date.now()}`;
const value = { data: "This is a test", list: [] };
const valueText = "This is a simple value";
const patch = [
  {
    op: "add",
    path: "/list/-",
    value: {
      id: "cred-new-credential",
      type: "Verifiable ID",
      hash:
        "0x4f76b6a20aa300c6975ae3121c4cc859465378460da2500e4ba5d2d41b428728",
      name: "Verifiable ID",
      issuer: "did:ebsi:0x79475f0ffB15eD8c27D7Fe9A0Ceb1585Cc3fB1B3",
    },
  },
];

// axios: don't throw error for status >= 400
axios.defaults.validateStatus = () => {
  return true;
};
let axiosAuth;

/*
 * Tests
 */

describe("key value storage tests", () => {
  it("create a new session with storage API", async () => {
    expect.assertions(2);
    const agent = new ebsiAppJwt.Agent(
      TEST_APP_NAME,
      privKey,
      config.trustedAppsRegistry
    );
    const requestToken = agent.newRequest("ebsi-storage");

    const opts = {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };
    const response = await axios.post(
      `${url}/storage/v1/sessions`,
      requestToken,
      opts
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

  it("create key", async () => {
    expect.assertions(1);
    const opts = { headers: { "Content-Type": "text/plain" } };
    const response = await axiosAuth.put(
      `${apiKeyValue}/${key}`,
      valueText,
      opts
    );
    expect(response.status).toBe(200);
  });

  it("get key", async () => {
    expect.assertions(2);
    const response = await axiosAuth.get(`${apiKeyValue}/${key}`);
    expect(response.status).toBe(200);
    expect(response.data).toBe(valueText);
  });

  it("update key", async () => {
    expect.assertions(3);
    const response = await axiosAuth.put(`${apiKeyValue}/${key}`, value);
    expect(response.status).toBe(201);
    const responseRead = await axiosAuth.get(`${apiKeyValue}/${key}`);
    expect(responseRead.status).toBe(200);
    expect(responseRead.data).toStrictEqual(expect.objectContaining(value));
  });

  it("patch key", async () => {
    expect.assertions(2);
    const response = await axiosAuth.patch(`${apiKeyValue}/${key}`, patch);
    expect(response.status).toBe(200);
    expect(response.data.list).toHaveLength(1);
  });

  it("delete key", async () => {
    expect.assertions(1);
    const response = await axiosAuth.delete(`${apiKeyValue}/${key}`);
    expect(response.status).toBe(204);
  });
});
