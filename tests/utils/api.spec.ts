import axios from "axios";
import { api } from "../../src/utils";

describe("api test suite", () => {
  it("should call a post without token and return", async () => {
    expect.assertions(1);
    const data = "Response OK";
    const mockedPost = jest.spyOn(axios, "post").mockResolvedValue({ data });
    const response = await api.doPostCallWithoutToken({}, "http://localhost");
    expect(response).toBe(data);
    mockedPost.mockRestore();
  });

  it("should throw an error when calling post without a token", async () => {
    expect.assertions(1);
    const error = "Response ERROR";
    const mockedPost = jest
      .spyOn(axios, "post")
      .mockRejectedValue(new Error(error));
    await expect(
      api.doPostCallWithoutToken({}, "http://localhost")
    ).rejects.toThrow(error);
    mockedPost.mockRestore();
  });

  it("should call a post with token and return", async () => {
    expect.assertions(1);
    const data = "Response OK";
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest.spyOn(axios, "post").mockResolvedValue({ data });
    const response = await api.doPostCallWithToken(
      token,
      {},
      "http://localhost"
    );
    expect(response).toBe(data);
    mockedPost.mockRestore();
  });

  it("should throw an error when calling post with a token", async () => {
    expect.assertions(1);
    const error = "Response ERROR";
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest
      .spyOn(axios, "post")
      .mockRejectedValue(new Error(error));
    await expect(
      api.doPostCallWithToken(token, {}, "http://localhost")
    ).rejects.toThrow(error);
    mockedPost.mockRestore();
  });

  it("should call a get without token and return", async () => {
    expect.assertions(1);
    const data = "Response OK";
    const mockedPost = jest.spyOn(axios, "get").mockResolvedValue({ data });
    const response = await api.doGetCallWithoutToken("http://localhost");
    expect(response).toBe(data);
    mockedPost.mockRestore();
  });

  it("should throw an error when calling get without a token", async () => {
    expect.assertions(1);
    const error = "Response ERROR";
    const mockedPost = jest
      .spyOn(axios, "get")
      .mockRejectedValue(new Error(error));
    await expect(api.doGetCallWithoutToken("http://localhost")).rejects.toThrow(
      error
    );
    mockedPost.mockRestore();
  });

  it("should call a get with token and return", async () => {
    expect.assertions(1);
    const data = "Response OK";
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest.spyOn(axios, "get").mockResolvedValue({ data });
    const response = await api.doGetCallWithToken(token, "http://localhost");
    expect(response).toBe(data);
    mockedPost.mockRestore();
  });

  it("should throw an error when calling get with a token", async () => {
    expect.assertions(1);
    const error = "Response ERROR";
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest
      .spyOn(axios, "get")
      .mockRejectedValue(new Error(error));
    await expect(
      api.doGetCallWithToken(token, "http://localhost")
    ).rejects.toThrow(error);
    mockedPost.mockRestore();
  });
});
