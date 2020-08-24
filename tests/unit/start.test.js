/* eslint-disable global-require */
const { Express } = require("jest-express/lib/express");
const FabricClient = require("fabric-client");

jest.spyOn(FabricClient, "loadFromConfig").mockImplementation(() => {
  const client = new FabricClient();
  client.newChannel("ebsichannel");
  return client;
});

const Server = require("../../src/server");

jest.mock("express", () => {
  return require("jest-express");
});

describe("launch the besu api", () => {
  it("calls express() listen to start the api", async () => {
    expect.assertions(1);

    const app = new Express();
    app.listen.mockImplementation((port, callback) => {
      callback();
      expect(port).toBe(9999);
    });

    new Server(app).start(9999);
  });
});
