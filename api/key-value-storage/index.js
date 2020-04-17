var express = require("express");
var bodyParser = require("body-parser");
var swaggerUi = require("swagger-ui-express");
const debug = require("debug")("http-body");
var router = express.Router();

var config = require("../../config");
var apiAuth = require("../../apiAuth");
var swaggerDocument = require("../swagger/swagger-key-value-storage.json");

router.use(bodyParser.json({ limit: "10mb", extended: true, type: "*/*" }));
router.use("/", apiAuth.handleToken(config.STORAGE_API_NAME));
router.get("/swagger.json", (req, res) => res.send(swaggerDocument));
router.use("/api-docs", swaggerUi.serve, (...args) =>
  swaggerUi.setup(swaggerDocument)(...args)
);
router.get("/login", apiAuth.login(config.STORAGE_API_NAME));

const TABLE_KEY_VALUE_STORAGE = "key_value_storage";

async function insert(req, res) {
  debug(req.body);
  var query =
    "insert into " + TABLE_KEY_VALUE_STORAGE + " (key, value) values (?, ?)";
  var params = [req.body.key, JSON.stringify(req.body.value)];
  try {
    var result = await req.cassandra.execute(query, params);
  } catch (error) {
    res.status(500).send("Internal error");
    console.log(error);
    return;
  }

  if (result.info && result.info.isSchemaInAgreement)
    res.send({ message: "key inserted" });
  else {
    res.status(500).send("Insert error");
    console.log("Insert error");
    console.log(result);
  }
}

async function update(req, res) {
  debug(req.body);
  var query =
    "update " +
    TABLE_KEY_VALUE_STORAGE +
    " set value = ? where key=? if exists";
  var params = [JSON.stringify(req.body.value), req.body.key];

  try {
    var result = await req.cassandra.execute(query, params);
  } catch (error) {
    res.status(500).send("Internal error");
    console.log(error);
    return;
  }

  if (result.info && result.info.isSchemaInAgreement)
    res.send({ message: "key updated" });
  else {
    res.status(500).send("Update error");
    console.log("Update error");
    console.log(result);
  }
}

async function _delete(req, res) {
  debug(req.body);
  var query =
    "delete from " + TABLE_KEY_VALUE_STORAGE + " where key = ? if exists";
  var params = [req.body.key];

  try {
    var result = await req.cassandra.execute(query, params);
  } catch (error) {
    res.status(500).send("Internal error");
    console.log(error);
    return;
  }

  if (result.info && result.info.isSchemaInAgreement)
    res.send({ message: "key deleted" });
  else {
    res.status(500).send("Delete error");
    console.log("Delete error");
    console.log(result);
  }
}

async function getValue(req, res) {
  var query =
    "select * from " +
    TABLE_KEY_VALUE_STORAGE +
    " where key = ? allow filtering";
  var params = [req.params.key];

  try {
    var result = await req.cassandra.execute(query, params);
  } catch (error) {
    res.status(500).send("Internal error");
    console.log(error);
    return;
  }

  try {
    var record = result.first();
    if (record) {
      var value = JSON.parse(record.value);
      res.send(value);
    } else {
      res.status(404).send("key not found");
    }
  } catch (error) {
    res.status(500).send("Internal error: JSON");
    console.log(error);
  }
}

function auth(req, res, next) {
  if (!req.user) {
    res.status(401).send("Not authenticated user");
    return;
  }

  if (req.user.aud === config.STORAGE_API_NAME) next();
  else res.status(403).send("Unauthorized access");
}

function keyValueBody(req, res, next) {
  if (!req.body || !req.body.key || !req.body.value) {
    res.status(400).send("Bad body request");
    return;
  }
  if (typeof req.body.value !== "object") {
    res.status(400).send("Bad value. Use JSON structure");
    return;
  }
  next();
}

router.post("/insert", auth, keyValueBody, insert);
router.post("/update", auth, keyValueBody, update);
router.post("/delete", auth, _delete);
router.get("/:key", auth, getValue);

module.exports = router;
