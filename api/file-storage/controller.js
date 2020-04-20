const config = require("../../config");

var EBSIcassandra = require("./modules/cassandra");
// var EBSIgluster = require("./modules/gluster");

async function storeFile(input) {
  const {store, filename, file} = input;
  switch (store) {
    case "distributed":
      /* gluster disabled in V1
      const ebsiGluster = new EBSIgluster({ path: config.glusterfs.path  });
      ebsiGluster.storeFile(filename, file);
      */
      await EBSIcassandra.storeFile(filename, file);
      break;
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

async function readFile(input) {
  const {store, hash} = input;
  switch (store) {
    case "distributed":
      // Gluster disabled in V1
      const record = await EBSIcassandra.readFile(hash);
      return record;
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

async function deleteFile(input) {
  const {store, hash} = input;
  switch (store) {
    case "distributed":
      // Gluster disabled in V1
      await EBSIcassandra.deleteFile(hash);
      return;
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

async function getListFiles(input) {
  const {store, query} = input;
  switch (store) {
    case "distributed":
      // Gluster disabled in V1
      return await EBSIcassandra.getListFiles(query);
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

module.exports = {
  storeFile,
  readFile,
  deleteFile,
}
