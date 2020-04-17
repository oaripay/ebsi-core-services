const fs = require("fs");
var path = require("path");
var ethers = require("ethers");

const TABLE_FILE_STORAGE = "documents_data";

function EBSIcassandra(options) {
  this.client = options.client;
}

EBSIcassandra.prototype.store = async function(req, res, next) {
  if (!req.tempfile || !req.public_key || !req.filename) {
    throw new Error("The request need tempfile, public_key and filename");
  }

  var data = fs.readFileSync(req.tempfile);
  var hash = ethers.utils.keccak256(data);
  // var public_key = req.user.public_key.toLowerCase()
  var public_key = "0x0000000000000000000000000000000000000000";

  var query = `select * from ${TABLE_FILE_STORAGE} where hash = ? and publickey = ? allow filtering`;
  var params = [hash, public_key];

  var result;
  try {
    result = await req.cassandra.execute(query, params);
  } catch (error) {
    res.status(500).send("Internal error");
    console.log(error);
    return;
  }

  if (result.first()) {
    res.status(400).send("This file is already stored");
    next();
    return;
  }

  query = `insert into ${TABLE_FILE_STORAGE} (id, publickey, filename, hash, data) VALUES (now(), ?, ?, ?, ?)`;
  params = [public_key, req.filename, hash, data];

  try {
    result = await req.cassandra.execute(query, params);
  } catch (error) {
    res.status(500).send("Internal error");
    console.log(error);
    return;
  }

  if (result.info && result.info.isSchemaInAgreement) {
    res.send({ message: "File stored", hash: hash });
  } else {
    res.status(500).send("Store error");
    console.log("Store error");
    console.log(result);
  }
  next();
};

EBSIcassandra.prototype.read = async function(req, res, next) {
  // var public_key = req.user.public_key.toLowerCase()
  var public_key = "0x0000000000000000000000000000000000000000";

  var query = `select * from ${TABLE_FILE_STORAGE} where hash = ? and publickey = ? allow filtering`;
  var params = [req.params.hash, public_key];

  try {
    var result = await this.client.execute(query, params);
  } catch (error) {
    res.status(500).send("Internal error");
    console.log(error);
    return;
  }

  var record = result.first();
  if (record) {
    res.writeHead(200, {
      "Content-Type": "application/" + path.extname(record.filename),
      "Content-disposition": "attachment;filename=" + record.filename,
      "Content-Length": record.data.length
    });
    res.end(Buffer.from(record.data, "binary"));
    next(true);
  } else {
    next(false);
  }
};

EBSIcassandra.prototype._delete = async function(req, res) {
  var public_key = "0x0000000000000000000000000000000000000000";
  var query = `select * from ${TABLE_FILE_STORAGE} where hash = ? and publickey = ? allow filtering`;
  var params = [req.params.hash, public_key];

  var result;
  try {
    result = await this.client.execute(query, params);
  } catch (error) {
    res.status(500).send("Internal error");
    console.log(error);
    return;
  }

  var record = result.first();
  if (!record) {
    res.status(404).send("File not found");
    return;
  }

  query = `delete from ${TABLE_FILE_STORAGE} where id = ? and hash = ? if exists`;
  params = [record.id, req.params.hash];

  try {
    result = await this.client.execute(query, params);
  } catch (error) {
    res.status(500).send("Internal error");
    console.log(error);
    return;
  }

  if (result.info && result.info.isSchemaInAgreement) {
    res.send({ message: "File deleted" });
  } else {
    res.status(500).send("Delete error");
    console.log("Delete error");
    console.log(result);
  }
};

module.exports = EBSIcassandra;
