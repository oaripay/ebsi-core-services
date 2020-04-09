var jose = require("jose");
var crypto = require("crypto");
var ethers = require("ethers");
var fs = require("fs");
var FormData = require("form-data");
require("dotenv").config();

var { axios2 } = require("./utils");
var config = require("./config");

var token, badToken, selfToken;
var filename, data, hash, randomHash;

/*
 * Initialization
 */

jest.setTimeout(30000);

beforeAll(() => {
  // Self token for login
  var payload = {
    iss: config.app_name,
    aud: "ebsi-storage"
  };
  var key = config.private_key;
  selfToken = jose.JWT.sign(payload, key, { expiresIn: "15 minutes" });
  badToken = selfToken;

  // File data
  filename = "random-bytes.bin";
  data = crypto.randomBytes(1024);
  hash = ethers.utils.keccak256(data);
  randomHash = ethers.utils.keccak256(
    Buffer.from(
      Math.random()
        .toString(36)
        .substring(7),
      "utf8"
    )
  );
});

/*
 * Tests
 */

test("Login in File Storage API", async () => {
  var response = await _login(selfToken);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(
    expect.objectContaining({
      token: expect.any(String)
    })
  );
  token = response.data.token;
});

test("Store file without auth is not allowed", async () => {
  var response = await _storeFile(data, filename, "cassandra");
  expect(response.status).toBe(401);
});

test("Store file with bad database reference is rejected", async () => {
  var response = await _storeFile(data, filename, "bad name", token);
  expect(response.status).toBe(404);
});

test("Delete file without auth is not allowed", async () => {
  var response = await _deleteFile(hash, "cassandra");
  expect(response.status).toBe(401);
});

test("Store file in cassandra", async () => {
  var response = await _storeFile(data, filename, "cassandra", token);
  expect(response.status).toBe(200);
});

test("Read file without auth is not allowed", async () => {
  var response = await _readFile(hash, "cassandra");
  expect(response.status).toBe(401);
});

test("Read file with bad auth is not allowed", async () => {
  var response = await _readFile(hash, "cassandra", badToken);
  expect(response.status).toBe(401);
});

test("Read file from cassandra", async () => {
  var response = await _readFile(hash, "cassandra", token);
  expect(response.status).toBe(200);

  var tempFilename = await pipeFile(response);
  var data2 = fs.readFileSync(tempFilename);
  fs.unlinkSync(tempFilename);
  expect(data2).toEqual(data);
});

test("Read file using a bad hash is rejected", async () => {
  var response = await _readFile("BAD HASH", "cassandra", token);
  expect(response.status).toBe(400);
});

test("File not found in cassandra using a random hash", async () => {
  var response = await _readFile(randomHash, "cassandra", token);
  expect(response.status).toBe(404);
});

test("Trying to delete a file that do not exist", async () => {
  var response = await _deleteFile(randomHash, "cassandra", token);
  expect(response.status).toBe(404);
});

test("Delete file in cassandra and verify", async () => {
  var response = await _deleteFile(hash, "cassandra", token);
  expect(response.status).toBe(200);

  response = await _readFile(hash, "cassandra", token);
  expect(response.status).toBe(404);
});

test("Store file in mongo", async () => {
  var response = await _storeFile(data, filename, "mongo", token);
  expect(response.status).toBe(200);
});

test("Read file from mongo", async () => {
  var response = await _readFile(hash, "mongo", token);
  expect(response.status).toBe(200);

  var tempFilename = await pipeFile(response);
  var data2 = fs.readFileSync(tempFilename);
  fs.unlinkSync(tempFilename);
  expect(data2).toEqual(data);
});

test("Delete file in mongo and verify", async () => {
  var response = await _deleteFile(hash, "mongo", token);
  expect(response.status).toBe(200);

  response = await _readFile(hash, "mongo", token);
  expect(response.status).toBe(404);
});

test("Store file in gluster-fs", async () => {
  var response = await _storeFile(data, filename, "gluster-fs", token);
  expect(response.status).toBe(200);
});

test("Read file from gluster-fs", async () => {
  var response = await _readFile(hash, "gluster-fs", token);
  expect(response.status).toBe(200);

  var tempFilename = await pipeFile(response);
  var data2 = fs.readFileSync(tempFilename);
  fs.unlinkSync(tempFilename);
  expect(data2).toEqual(data);
});

test("Delete file in gluster-fs and verify", async () => {
  var response = await _deleteFile(hash, "gluster-fs", token);
  expect(response.status).toBe(200);

  response = await _readFile(hash, "gluster-fs", token);
  expect(response.status).toBe(404);
});

test("Store, read and delete a file of 1 MB in cassandra", async () => {
  var filename = "random-bytes.bin";
  var data = crypto.randomBytes(1024 * 1024);
  var hash = ethers.utils.keccak256(data);

  var response = await _storeFile(data, filename, "cassandra", token);
  expect(response.status).toBe(200);

  response = await _readFile(hash, "cassandra", token);
  expect(response.status).toBe(200);

  var tempFilename = await pipeFile(response);
  var data2 = fs.readFileSync(tempFilename);
  fs.unlinkSync(tempFilename);
  expect(data2).toEqual(data);

  response = await _deleteFile(hash, "cassandra", token);
  expect(response.status).toBe(200);
});

test("Store, read and delete a file of 15 MB in cassandra", async () => {
  var filename = "random-bytes.bin";
  var data = crypto.randomBytes(15 * 1024 * 1024);
  var hash = ethers.utils.keccak256(data);

  var response = await _storeFile(data, filename, "cassandra", token);
  expect(response.status).toBe(200);

  response = await _readFile(hash, "cassandra", token);
  expect(response.status).toBe(200);

  var tempFilename = await pipeFile(response);
  var data2 = fs.readFileSync(tempFilename);
  fs.unlinkSync(tempFilename);
  expect(data2).toEqual(data);

  response = await _deleteFile(hash, "cassandra", token);
  expect(response.status).toBe(200);
});

test("Can not store files greater than 16 MB in cassandra", async () => {
  var filename = "random-bytes.bin";
  var data = crypto.randomBytes(16 * 1024 * 1024);

  var response = await _storeFile(data, filename, "cassandra", token);
  expect(response.status).toBe(400);
});

test("Store, read and delete a file of 15 MB in mongo", async () => {
  var filename = "random-bytes.bin";
  var data = crypto.randomBytes(15 * 1024 * 1024);
  var hash = ethers.utils.keccak256(data);

  var response = await _storeFile(data, filename, "mongo", token);
  expect(response.status).toBe(200);

  response = await _readFile(hash, "mongo", token);
  expect(response.status).toBe(200);

  var tempFilename = await pipeFile(response);
  var data2 = fs.readFileSync(tempFilename);
  fs.unlinkSync(tempFilename);
  expect(data2).toEqual(data);

  response = await _deleteFile(hash, "mongo", token);
  expect(response.status).toBe(200);
});

test("Can not store files greater than 16 MB in mongo", async () => {
  var filename = "random-bytes.bin";
  var data = crypto.randomBytes(16 * 1024 * 1024);

  var response = await _storeFile(data, filename, "mongo", token);
  expect(response.status).toBe(400);
});

/*
 * Functions
 */

function _login(token) {
  return axios2.get(config.api.fileStorage + "/login", token);
}

function _storeFile(buffer, filename, database, token) {
  var form = new FormData();
  form.append("my_file", buffer, filename);
  // form.append('public_key','0xfaB57D6F7182A98fEF9d23A18c6c607f46f4fC94')
  form.append("database", database);
  var opts = {
    headers: { post: form.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  };
  return axios2.post(config.api.fileStorage + "/store", form, token, opts);
}

function _readFile(hash, database, token) {
  var url = config.api.fileStorage + "/" + hash;
  if (database) url += "/" + database;
  return axios2.get(url, token, { responseType: "stream" });
}

function _deleteFile(hash, database, token) {
  var url = config.api.fileStorage + "/delete/" + hash;
  if (database) url += "/" + database;
  return axios2.post(url, {}, token);
}

function pipeFile(response) {
  var contentDisposition = response.headers["content-disposition"];
  var fname = contentDisposition.split("filename=")[1];
  var tempName =
    Math.random()
      .toString(36)
      .substring(2) + fname;
  var stream = fs.createWriteStream(tempName);

  return new Promise(function(resolve, reject) {
    response.data
      .pipe(stream)
      .on("finish", () => resolve(tempName))
      .on("error", error => reject(error));
  });
}
