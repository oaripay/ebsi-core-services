const KeyValueCassandra = require("./modules/cassandra");

async function setKey(store, key, value) {
  return KeyValueCassandra.setKey(key, value);
}

async function getKey(store, key) {
  return KeyValueCassandra.getKey(key);
}

async function deleteKey(store, key) {
  return KeyValueCassandra.deleteKey(key);
}

async function patchKey(store, key, patch) {
  return KeyValueCassandra.patchKey(key, patch);
}

async function getListKeys(store, query) {
  return KeyValueCassandra.getListKeys(query, store);
}

module.exports = {
  setKey,
  getKey,
  deleteKey,
  patchKey,
  getListKeys,
};
