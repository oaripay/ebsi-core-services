const axios = require("axios");
const jose = require("jose");
const crypto = require("crypto");
const ethers = require("ethers");
const fs = require("fs");
const FormData = require("form-data");
require("dotenv").config();

const config = require("../src/config");
const configTest = require("./config");

const { api, TEST_APP_NAME, privKey } = configTest;
const apiFiles = `${api}/stores/distributed/files`;

jest.setTimeout(30000);

// axios: don't throw error for status >= 400
axios.defaults.validateStatus = () => {
  return true;
};

const filename1k = "random-bytes.bin";
const data1k = crypto.randomBytes(1024);
const hash1k = ethers.utils.keccak256(data1k);

const filename1mb = "random-bytes.bin";
const data1mb = crypto.randomBytes(1024 * 1024);
const hash1mb = ethers.utils.keccak256(data1mb);

const filenameBig = "random-bytes.bin";
const dataBig = crypto.randomBytes(16 * 1024 * 1024);

const randomData = crypto.randomBytes(128);
const randomHash = ethers.utils.keccak256(randomData);

let axiosAuth;

/*
 * Functions
 */

function storeFile(buffer, filename) {
  const form = new FormData();
  form.append("my_file", buffer, filename);
  const opts = {
    headers: { post: form.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  };
  return axiosAuth.post(apiFiles, form, opts);
}

function readFile(hash) {
  const opts = {
    responseType: "stream",
  };
  return axiosAuth.get(`${apiFiles}/${hash}`, opts);
}

function pipeFile(response) {
  const contentDisposition = response.headers["content-disposition"];
  const fname = contentDisposition.split("filename=")[1];
  const tempName = Math.random().toString(36).substring(2) + fname;
  const stream = fs.createWriteStream(tempName);

  return new Promise((resolve, reject) => {
    response.data
      .pipe(stream)
      .on("finish", () => resolve(tempName))
      .on("error", (error) => reject(error));
  });
}

/*
 * Tests
 */

describe("file storage tests", () => {
  it("create a new session with storage API", async () => {
    expect.assertions(2);
    const payload = {
      iss: TEST_APP_NAME,
      aud: config.API_NAME,
    };
    const opts = { expiresIn: "15 minutes" };
    const selfToken = jose.JWT.sign(payload, privKey, opts);

    const response = await axios.post(`${api}/sessions`, {
      grantType: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: selfToken,
    });
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

  it("store file without auth is not allowed", async () => {
    expect.assertions(1);
    const response = await axios.post(`${api}/sessions`);
    expect(response.status).toBe(400);
  });

  it("store file", async () => {
    expect.assertions(2);
    const response = await storeFile(data1k, filename1k);
    expect(response.status).toBe(201);
    expect(response.data).toStrictEqual(
      expect.objectContaining({
        hash: hash1k,
        function: "keccak256",
      })
    );
  });

  it("read file without auth is not allowed", async () => {
    expect.assertions(1);
    const response = await axios.get(`${apiFiles}/${hash1k}`);
    expect(response.status).toBe(401);
  });

  it("read file", async () => {
    expect.assertions(2);
    const response = await readFile(hash1k);
    expect(response.status).toBe(200);

    const tempFilename = await pipeFile(response);
    const data = fs.readFileSync(tempFilename);
    fs.unlinkSync(tempFilename);
    expect(data).toStrictEqual(data1k);
  });

  it("file not found using a random hash", async () => {
    expect.assertions(2);
    const response = await axiosAuth.get(`${apiFiles}/${randomHash}`);
    expect(response.status).toBe(404);
    expect(response.data).toStrictEqual(
      expect.objectContaining({
        status: 404,
      })
    );
  });

  it("trying to delete a file that do not exist", async () => {
    expect.assertions(2);
    const response = await axiosAuth.delete(`${apiFiles}/${randomHash}`);
    expect(response.status).toBe(404);
    expect(response.data).toStrictEqual(
      expect.objectContaining({
        status: 404,
      })
    );
  });

  it("delete file and verify", async () => {
    expect.assertions(2);
    const response = await axiosAuth.delete(`${apiFiles}/${hash1k}`);
    expect(response.status).toBe(204);

    const responseRead = await axiosAuth.get(`${apiFiles}/${hash1k}`);
    expect(responseRead.status).toBe(404);
  });

  it("store, read and delete a file of 1 MB", async () => {
    expect.assertions(5);
    const response = await storeFile(data1mb, filename1mb);
    expect(response.status).toBe(201);
    expect(response.data).toStrictEqual(
      expect.objectContaining({
        hash: hash1mb,
        function: "keccak256",
      })
    );

    const responseRead = await readFile(hash1mb);
    expect(responseRead.status).toBe(200);

    const tempFilename = await pipeFile(responseRead);
    const data = fs.readFileSync(tempFilename);
    fs.unlinkSync(tempFilename);
    expect(data).toStrictEqual(data1mb);

    const responseDelete = await axiosAuth.delete(`${apiFiles}/${hash1mb}`);
    expect(responseDelete.status).toBe(204);
  });

  it("can not store files greater than 16 MB", async () => {
    expect.assertions(1);
    const response = await storeFile(dataBig, filenameBig);
    expect(response.status).toBe(413);
  });
});
