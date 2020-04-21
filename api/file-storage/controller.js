const EBSIcassandra = require("./modules/cassandra");
// var EBSIgluster = require("./modules/gluster");

function storeFile(input) {
  const { store, filename, file } = input;
  switch (store) {
    case "distributed":
      /* gluster disabled in V1
      const ebsiGluster = new EBSIgluster({ path: config.glusterfs.path  });
      ebsiGluster.storeFile(filename, file);
      */
      return EBSIcassandra.storeFile(filename, file);
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

function readFile(input) {
  const { store, hash } = input;
  switch (store) {
    case "distributed":
      // Gluster disabled in V1
      return EBSIcassandra.readFile(hash);
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

async function deleteFile(input) {
  const { store, hash } = input;
  switch (store) {
    case "distributed":
      // Gluster disabled in V1
      await EBSIcassandra.deleteFile(hash);
      return;
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

function getListFiles(input) {
  const { store, query } = input;
  switch (store) {
    case "distributed":
      // Gluster disabled in V1
      return EBSIcassandra.getListFiles(query, store);
    default:
      throw new Error(`No handle for store '${store}'`);
  }
}

module.exports = {
  storeFile,
  readFile,
  deleteFile,
  getListFiles,
};
