import { LoggerService } from "@nestjs/common";
import axios from "axios";
import httpAdapter from "axios/lib/adapters/http";
import nock from "nock";
import { setupInterceptors } from "./axiosInterceptors";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
axios.defaults.adapter = httpAdapter;
nock.disableNetConnect();

describe("setupInterceptors", () => {
  afterEach(() => {
    nock.cleanAll();

    // Remove interceptors (max 3)
    axios.interceptors.request.eject(0);
    axios.interceptors.response.eject(0);
    axios.interceptors.request.eject(1);
    axios.interceptors.response.eject(1);
    axios.interceptors.request.eject(2);
    axios.interceptors.response.eject(2);
  });

  afterAll(() => {
    nock.restore();
  });

  it("should do nothing if the 'domain' or 'localOrigin' varaiable is not defined or empty", () => {
    expect.assertions(2);
    expect(setupInterceptors("", "")).toBeUndefined();
    expect(
      setupInterceptors("https://api.test.intebsi.xyz", "")
    ).toBeUndefined();
  });

  it("should intercept Axios requests", async () => {
    expect.assertions(1);

    setupInterceptors("https://api.test.intebsi.xyz", "http://api.local");

    // Set up 2 mocked servers (local, remote)
    nock("http://api.local")
      .get("/trusted-apps-registry/v2/apps")
      .reply(200, "local");

    nock("https://api.test.intebsi.xyz")
      .get("/trusted-apps-registry/v2/apps")
      .reply(200, "remote");

    // Query the remote server
    const response = await axios.get(
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps"
    );

    // Expect a response from the local server
    expect(response.data).toBe("local");
  });

  it("should not call the remote server if the local server responded with a status < 500", async () => {
    expect.assertions(1);

    setupInterceptors("https://api.test.intebsi.xyz", "http://api.local");

    // Set up 2 mocked servers (local, remote)
    nock("http://api.local").get("/trusted-apps-registry/v2/apps").reply(401);

    nock("https://api.test.intebsi.xyz")
      .get("/trusted-apps-registry/v2/apps")
      .reply(200, "remote");

    // Querying the remote server should be intercepted and return the 404 error from the local server
    await expect(() =>
      axios.get("https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps")
    ).rejects.toThrow("Request failed with status code 401");
  });

  it("should fallback to the remote server if the local server responds with a status >= 500", async () => {
    expect.assertions(5);

    const logger = {
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    setupInterceptors(
      "https://api.test.intebsi.xyz",
      "http://api.local",
      logger as unknown as LoggerService
    );

    // Set up 2 mocked servers (local, remote)
    nock("http://api.local")
      .get("/trusted-apps-registry/v2/apps")
      .reply(500, "local");

    nock("https://api.test.intebsi.xyz")
      .get("/trusted-apps-registry/v2/apps")
      .reply(200, "remote");

    // Query the remote server
    const response = await axios.get(
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps"
    );

    // Expect a response from the remote server
    expect(response.data).toBe("remote");

    // Check if the logger has been called as expected
    expect(logger.debug).toHaveBeenCalledWith(
      new Error("Request failed with status code 500"),
      "Axios Response Interceptor"
    );
    expect(logger.verbose).toHaveBeenCalledTimes(2);
    expect(logger.verbose).toHaveBeenNthCalledWith(
      1,
      "Replacing https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps with http://api.local/trusted-apps-registry/v2/apps",
      "Axios Request Interceptor"
    );
    expect(logger.verbose).toHaveBeenNthCalledWith(
      2,
      "Replacing http://api.local/trusted-apps-registry/v2/apps with https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps",
      "Axios Response Interceptor"
    );
  });

  it("should fallback to the remote server if the local server responds with a status 404 and the response is not a Problem Details error", async () => {
    expect.assertions(5);

    const logger = {
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    setupInterceptors(
      "https://api.test.intebsi.xyz",
      "http://api.local",
      logger as unknown as LoggerService
    );

    // Set up 2 mocked servers (local, remote)
    nock("http://api.local")
      .get("/trusted-apps-registry/v2/apps")
      .reply(404, "local");

    nock("https://api.test.intebsi.xyz")
      .get("/trusted-apps-registry/v2/apps")
      .reply(200, "remote");

    // Query the remote server
    const response = await axios.get(
      "https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps"
    );

    // Expect a response from the remote server
    expect(response.data).toBe("remote");

    // Check if the logger has been called as expected
    expect(logger.debug).toHaveBeenCalledWith(
      new Error("Request failed with status code 404"),
      "Axios Response Interceptor"
    );
    expect(logger.verbose).toHaveBeenCalledTimes(2);
    expect(logger.verbose).toHaveBeenNthCalledWith(
      1,
      "Replacing https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps with http://api.local/trusted-apps-registry/v2/apps",
      "Axios Request Interceptor"
    );
    expect(logger.verbose).toHaveBeenNthCalledWith(
      2,
      "Replacing http://api.local/trusted-apps-registry/v2/apps with https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps",
      "Axios Response Interceptor"
    );
  });

  it("should not call the remote server if the local server responded with a status 404 and the response is a Problem Details error", async () => {
    expect.assertions(1);

    setupInterceptors("https://api.test.intebsi.xyz", "http://api.local");

    // Set up 2 mocked servers (local, remote)
    nock("http://api.local").get("/trusted-apps-registry/v2/apps").reply(404, {
      title: "Not Found",
      status: 404,
    });

    nock("https://api.test.intebsi.xyz")
      .get("/trusted-apps-registry/v2/apps")
      .reply(200, "remote");

    // Querying the remote server should be intercepted and return the 404 error from the local server
    await expect(() =>
      axios.get("https://api.test.intebsi.xyz/trusted-apps-registry/v2/apps")
    ).rejects.toThrow("Request failed with status code 404");
  });
});
