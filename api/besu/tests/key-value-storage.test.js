var jose = require("jose");
require("dotenv").config();

var { axios2 } = require("./utils");
var config = require("./config");

var token, badToken, selfToken;
var data, dataUpdated;

/*
 * Initialization
 */

beforeAll(() => {
  // Self token for login
  var payload = {
    iss: config.app_name,
    aud: "ebsi-storage"
  };
  var pkey = config.private_key;
  selfToken = jose.JWT.sign(payload, pkey, { expiresIn: "15 minutes" });
  badToken = selfToken;

  // Data for testing
  var key =
    "my-key-" +
    Math.random()
      .toString(36)
      .substring(7);
  var value = {
    name: "test user",
    credentials: [
      {
        data: "credential 1"
      },
      {
        data: "credential 2"
      }
    ]
  };
  data = { key, value };

  var valueUpdated = JSON.parse(JSON.stringify(value));
  valueUpdated.new_attribute = "This is a new attribute";
  dataUpdated = { key, value: valueUpdated };
});

/*
 * Tests
 */

test("Login in Key Value Storage API", async () => {
  var response = await _login(selfToken);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(
    expect.objectContaining({
      token: expect.any(String)
    })
  );
  token = response.data.token;
});

test("Insert data without auth not allowed", async () => {
  var response = await _insert(data);
  expect(response.status).toBe(401);
});

test("Insert data with bad token not allowed", async () => {
  var response = await _insert(data, badToken);
  expect(response.status).toBe(401);
});

test("Insert data", async () => {
  var response = await _insert(data, token);
  expect(response.status).toBe(200);
});

test("Get data without auth not allowed", async () => {
  var response = await _get(data.key);
  expect(response.status).toBe(401);
});

test("Get data with bad token not allowed", async () => {
  var response = await _get(data.key, badToken);
  expect(response.status).toBe(401);
});

test("Get data", async () => {
  var response = await _get(data.key, token);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(data.value);
});

test("Update data without auth not allowed", async () => {
  var response = await _update(dataUpdated);
  expect(response.status).toBe(401);
});

test("Update data with bad token not allowed", async () => {
  var response = await _update(dataUpdated, badToken);
  expect(response.status).toBe(401);
});

test("Update data and verify update", async () => {
  var response = await _update(dataUpdated, token);
  expect(response.status).toBe(200);

  response = await _get(data.key, token);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(dataUpdated.value);
});

test("Delete data without auth not allowed", async () => {
  var response = await _delete(data);
  expect(response.status).toBe(401);
});

test("Delete data with bad token not allowed", async () => {
  var response = await _delete(data, badToken);
  expect(response.status).toBe(401);
});

test("Delete data and verify deletion", async () => {
  var response = await _delete(data, token);
  expect(response.status).toBe(200);

  response = await _get(data.key, token);
  expect(response.status).toBe(404);
});

test("Delete data again returns 200", async () => {
  var response = await _delete(data, token);
  expect(response.status).toBe(200);
});

/*
 * Functions
 */

function _login(token) {
  return axios2.get(config.api.keyValueStorage + "/login", token);
}

function _insert(params, token) {
  return axios2.post(config.api.keyValueStorage + "/insert", params, token);
}

function _update(params, token) {
  return axios2.post(config.api.keyValueStorage + "/update", params, token);
}

function _delete(params, token) {
  return axios2.post(config.api.keyValueStorage + "/delete", params, token);
}

function _get(key, token) {
  return axios2.get(config.api.keyValueStorage + "/" + key, token);
}
