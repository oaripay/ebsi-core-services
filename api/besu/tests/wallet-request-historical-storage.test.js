var jose = require("jose");
var ethers = require("ethers");
require("dotenv").config();

var { axios2 } = require("./utils");
var config = require("./config");

var token, badToken, selfToken;
var emisors, receptors;
var data, data2, recId;

/*
 * Initialization
 */

beforeAll(() => {
  // Self token for login
  var payload = {
    iss: config.app_name,
    aud: "ebsi-storage"
  };
  var key = config.private_key;
  selfToken = jose.JWT.sign(payload, key, { expiresIn: "15 minutes" });
  badToken = selfToken;

  // Data for testing
  emisors = [
    ethers.Wallet.createRandom().address,
    ethers.Wallet.createRandom().address
  ];

  receptors = [
    ethers.Wallet.createRandom().address,
    ethers.Wallet.createRandom().address
  ];

  data = [];
  data2 = [];
  for (var i = 0; i < 2; i++) {
    var mm = [];
    var mm2 = [];
    for (var j = 0; j < 2; j++) {
      mm.push({
        emisor: emisors[i],
        receptor: receptors[j],
        message: {
          msg: `Message from ${i + 1} to ${j + 1}`
        }
      });
      mm2.push({
        emisor: emisors[i],
        receptor: receptors[j],
        message: {
          msg: `Message updated from ${i + 1} to ${j + 1}`
        }
      });
    }
    data.push(mm);
    data2.push(mm2);
  }
});

/*
 * Tests
 */

var expectedId = expect.objectContaining({
  id: expect.any(String)
});

var expectedMessage = function(data) {
  if (!data) data = {};
  if (!data.emisor) data.emisor = expect.any(String);
  if (!data.receptor) data.receptor = expect.any(String);
  if (!data.message) data.message = expect.objectContaining({});

  return expect.objectContaining({
    id: expect.any(String),
    timestamp: expect.any(String),
    emisor: data.emisor,
    receptor: data.receptor,
    message: data.message
  });
};

test("Login in Wallet Request Storage API", async () => {
  var response = await _login(selfToken);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(
    expect.objectContaining({
      token: expect.any(String)
    })
  );
  token = response.data.token;
});

test("Login in Wallet Historical Storage API", async () => {
  var response = await _loginHist(selfToken);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(
    expect.objectContaining({
      token: expect.any(String)
    })
  );
});

test("Insert data without auth not allowed", async () => {
  var response = await _insert(data[0][0]);
  expect(response.status).toBe(401);
});

test("Insert data with bad token not allowed", async () => {
  var response = await _insert(data[0][0], badToken);
  expect(response.status).toBe(401);
});

test("Insert messages (2 emisors, 2 receptors)", async () => {
  var response = await _insert(data[0][0], token);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expectedId);

  response = await _insert(data[0][1], token);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expectedId);

  response = await _insert(data[1][0], token);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expectedId);

  response = await _insert(data[1][1], token);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expectedId);

  recId = response.data.id;
});

test("Get messages without auth not allowed", async () => {
  var response = await _emisor(emisors[0]);
  expect(response.status).toBe(401);

  response = await _receptor(receptors[0]);
  expect(response.status).toBe(401);
});

test("Get messages with bad token not allowed", async () => {
  var response = await _emisor(emisors[0], badToken);
  expect(response.status).toBe(401);

  response = await _receptor(receptors[0], badToken);
  expect(response.status).toBe(401);
});

test("Get messages", async () => {
  var response = await _emisor(emisors[0], token);
  expect(response.status).toBe(200);
  expect(response.data).toHaveLength(2);
  expect(response.data[0]).toEqual(expectedMessage(data[0][0]));
  expect(response.data[1]).toEqual(expectedMessage(data[0][1]));

  response = await _emisor(emisors[1], token);
  expect(response.status).toBe(200);
  expect(response.data).toHaveLength(2);
  expect(response.data[0]).toEqual(expectedMessage(data[1][0]));
  expect(response.data[1]).toEqual(expectedMessage(data[1][1]));

  response = await _receptor(receptors[0], token);
  expect(response.status).toBe(200);
  expect(response.data).toHaveLength(2);
  expect(response.data[0]).toEqual(expectedMessage(data[0][0]));
  expect(response.data[1]).toEqual(expectedMessage(data[1][0]));

  response = await _receptor(receptors[1], token);
  expect(response.status).toBe(200);
  expect(response.data).toHaveLength(2);
  expect(response.data[0]).toEqual(expectedMessage(data[0][1]));
  expect(response.data[1]).toEqual(expectedMessage(data[1][1]));
});

test("Update message without auth not allowed", async () => {
  data2[1][1].id = recId;
  var response = await _update(data2[1][1]);
  expect(response.status).toBe(401);
});

test("Update message with bad token not allowed", async () => {
  data2[1][1].id = recId;
  var response = await _update(data2[1][1], badToken);
  expect(response.status).toBe(401);
});

test("Update message and verify update", async () => {
  data2[1][1].id = recId;

  var response = await _update(data2[1][1], token);
  expect(response.status).toBe(200);
  expect(response.data).toEqual(expectedId);

  response = await _receptor(receptors[1], token);
  expect(response.status).toBe(200);
  expect(response.data).toHaveLength(2);
  expect(response.data[1]).toEqual(expectedMessage(data2[1][1]));
});

test("Check no crossed data is in the database", async () => {
  var response = await _emisor(receptors[0], token);
  expect(response.status).toBe(200);
  expect(response.data).toHaveLength(0);

  response = await _receptor(emisors[0], token);
  expect(response.status).toBe(200);
  expect(response.data).toHaveLength(0);
});

test("Delete data without auth not allowed", async () => {
  var qR0 = (await _receptor(receptors[0], token)).data;
  var response = await _delete({ id: qR0[0].id });
  expect(response.status).toBe(401);
});

test("Delete data with bad token not allowed", async () => {
  var qR0 = (await _receptor(receptors[0], token)).data;
  var response = await _delete({ id: qR0[0].id }, badToken);
  expect(response.status).toBe(401);
});

test("Delete data, verify del and registration in historical", async () => {
  var qR1 = (await _receptor(receptors[0], token)).data;
  var qR2 = (await _receptor(receptors[1], token)).data;
  var qE1 = (await _emisor(emisors[0], token)).data;
  var qE2 = (await _emisor(emisors[1], token)).data;
  expect(qR1).toHaveLength(2);
  expect(qR2).toHaveLength(2);
  expect(qE1).toHaveLength(2);
  expect(qE2).toHaveLength(2);

  // delete messages from receptor 1
  var i, response;
  for (i in qR1) {
    response = await _delete({ id: qR1[i].id }, token);
    expect(response.status).toBe(200);
  }

  qR1 = (await _receptor(receptors[0], token)).data;
  qE1 = (await _emisor(emisors[0], token)).data;
  expect(qR1).toHaveLength(0); // messages deleted
  expect(qE1).toHaveLength(1); // 1: emisor 1 to receptor 2

  // delete messages from receptor 2
  for (i in qR2) {
    response = await _delete({ id: qR2[i].id }, token);
    expect(response.status).toBe(200);
  }

  // check all message deleted
  qR1 = (await _receptor(receptors[0], token)).data;
  qR2 = (await _receptor(receptors[1], token)).data;
  qE1 = (await _emisor(emisors[0], token)).data;
  qE2 = (await _emisor(emisors[1], token)).data;
  expect(qR1).toHaveLength(0);
  expect(qR2).toHaveLength(0);
  expect(qE1).toHaveLength(0);
  expect(qE2).toHaveLength(0);

  // check messages in historical
  qR1 = (await _receptorHist(receptors[0], token)).data;
  qR2 = (await _receptorHist(receptors[1], token)).data;
  qE1 = (await _emisorHist(emisors[0], token)).data;
  qE2 = (await _emisorHist(emisors[1], token)).data;
  expect(qR1).toHaveLength(2);
  expect(qR2).toHaveLength(2);
  expect(qE1).toHaveLength(2);
  expect(qE2).toHaveLength(2);
});

test("Delete data again returns 404", async () => {
  var response = await _delete({ id: recId }, token);
  expect(response.status).toBe(404);
});

/*
 * Functions Wallet Request Storage
 */

function _login(token) {
  return axios2.get(config.api.walletRequestStorage + "/login", token);
}

function _insert(params, token) {
  return axios2.post(
    config.api.walletRequestStorage + "/insert",
    params,
    token
  );
}

function _update(params, token) {
  return axios2.post(
    config.api.walletRequestStorage + "/update",
    params,
    token
  );
}

function _delete(params, token) {
  return axios2.post(
    config.api.walletRequestStorage + "/delete",
    params,
    token
  );
}

function _receptor(receptor, token) {
  return axios2.get(config.api.walletRequestStorage + "/" + receptor, token);
}

function _emisor(emisor, token) {
  return axios2.get(
    config.api.walletRequestStorage + "/emisor/" + emisor,
    token
  );
}

/*
 * Functions Wallet Historical Storage
 */

function _loginHist(token) {
  return axios2.get(config.api.walletHistoricalStorage + "/login", token);
}

function _receptorHist(receptor, token) {
  return axios2.get(config.api.walletHistoricalStorage + "/" + receptor, token);
}

function _emisorHist(emisor, token) {
  return axios2.get(
    config.api.walletHistoricalStorage + "/emisor/" + emisor,
    token
  );
}
