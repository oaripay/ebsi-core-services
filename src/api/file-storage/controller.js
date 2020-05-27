const FileCassandra = require("./modules/cassandra");

function storeFile(store, filename, file) {
  return FileCassandra.storeFile(filename, file);
}

function readFile(store, hash) {
  return FileCassandra.readFile(hash);
}

function deleteFile(store, hash) {
  return FileCassandra.deleteFile(hash);
}

function getListFiles(store, query) {
  return FileCassandra.getListFiles(query, store);
}

module.exports = {
  storeFile,
  readFile,
  deleteFile,
  getListFiles,
};
