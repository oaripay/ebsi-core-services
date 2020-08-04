import axios from "axios";
import { api } from "../../src/utils";
import { ICASFile } from "../../src/daos/casFile";
import { ICASStorageOut } from "../../src/dtos/dataStorage";

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

  it("should call a put with token and return", async () => {
    expect.assertions(1);
    const data = "Response OK";
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest.spyOn(axios, "put").mockResolvedValue({ data });
    const response = await api.doPutCallWithToken(
      token,
      {},
      "http://localhost"
    );
    expect(response).toBe(data);
    mockedPost.mockRestore();
  });

  it("should throw an error when calling put with a token", async () => {
    expect.assertions(1);
    const error = "Response ERROR";
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest
      .spyOn(axios, "put")
      .mockRejectedValue(new Error(error));
    await expect(
      api.doPutCallWithToken(token, {}, "http://localhost")
    ).rejects.toThrow(error);
    mockedPost.mockRestore();
  });

  it("should call a patch with token and return", async () => {
    expect.assertions(1);
    const data = "Response OK";
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest.spyOn(axios, "patch").mockResolvedValue({ data });
    const response = await api.doPatchCallWithToken(
      token,
      {},
      "http://localhost"
    );
    expect(response).toBe(data);
    mockedPost.mockRestore();
  });

  it("should throw an error when calling patch with a token", async () => {
    expect.assertions(1);
    const error = "Response ERROR";
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest
      .spyOn(axios, "patch")
      .mockRejectedValue(new Error(error));
    await expect(
      api.doPatchCallWithToken(token, {}, "http://localhost")
    ).rejects.toThrow(error);
    mockedPost.mockRestore();
  });

  it("should call a delete with token and not throw", async () => {
    expect.assertions(1);
    const data = "Response OK";
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest.spyOn(axios, "delete").mockResolvedValue({ data });
    expect(async () =>
      api.doDeleteCallWithToken(token, "http://localhost")
    ).not.toThrow();

    mockedPost.mockRestore();
  });

  it("should throw an error when calling delete with a token", async () => {
    expect.assertions(1);
    const error = "Response ERROR";
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest
      .spyOn(axios, "delete")
      .mockRejectedValue(new Error(error));
    await expect(
      api.doDeleteCallWithToken(token, "http://localhost")
    ).rejects.toThrow(error);
    mockedPost.mockRestore();
  });

  it("should call a post form with token and return", async () => {
    expect.assertions(1);
    const data: ICASStorageOut = {
      hash:
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
      function: "keccak256",
    };
    const iFile: ICASFile = {
      fileData: Buffer.from("test data").toString(),
      fileName: "test fileName",
      database: "cassandra",
    };
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest.spyOn(axios, "post").mockResolvedValue({ data });
    const response = await api.doPostFormCallWithToken(
      token,
      iFile,
      "http://localhost"
    );
    expect(response).toBe(data);
    mockedPost.mockRestore();
  });

  it("should throw an error when calling post form with a token", async () => {
    expect.assertions(1);
    const error = "Response ERROR";
    const iFile: ICASFile = {
      fileData: Buffer.from("test data").toString(),
      fileName: "test fileName",
      database: "cassandra",
    };
    const token =
      "eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJraWQiOiJlYnNpLXdhbGxldCJ9.eyJkaWQiOiJkaWQ6ZWJzaToweGNEQTU2ZTk4Q0Q5ZTQ1NDE0MzI4NWI3MmI1RGU4MDllN0M0MEM0M0YiLCJhdWQiOiJlYnNpLXdhbGxldCIsIm5vbmNlIjoiK3g1Z0lHZ2s4a0RvTFM4Y3I2MjdjUT09Iiwic3ViIjoiZWJzaS1zZWxmLXNvdmVyZWlnbi1pZGVudGl0eSIsImlhdCI6MTU4OTI3NjEzNiwiZXhwIjoxNTg5Mjc3MDM2fQ.oRBZyK4vT7AZV4WweabH0RHxIsEZgH_7TjoPj774_nsnuKk7mBXv87ZFsj0BgQSBOijRSHdNUpD65adzJCKOrg";
    const mockedPost = jest
      .spyOn(axios, "post")
      .mockRejectedValue(new Error(error));
    await expect(
      api.doPostFormCallWithToken(token, iFile, "http://localhost")
    ).rejects.toThrow(error);
    mockedPost.mockRestore();
  });
});
