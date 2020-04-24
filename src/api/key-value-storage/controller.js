const KeyValueCassandra = require("./modules/cassandra");

async function setKey(store, key, value) {
  switch (store) {
    case "distributed":
      return KeyValueCassandra.setKey(key, value);
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

async function getKey(store, key) {
  switch (store) {
    case "distributed":
      return KeyValueCassandra.getKey(key);
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

async function deleteKey(store, key) {
  switch (store) {
    case "distributed":
      return KeyValueCassandra.deleteKey(key);
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

async function patchKey(store, key, patch) {
  switch (store) {
    case "distributed":
      return KeyValueCassandra.patchKey(key, patch);
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

async function getListKeys(store, query) {
  switch (store) {
    case "distributed":
      return KeyValueCassandra.getListKeys(query, store);
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

module.exports = {
  setKey,
  getKey,
  deleteKey,
  patchKey,
  getListKeys,
};
