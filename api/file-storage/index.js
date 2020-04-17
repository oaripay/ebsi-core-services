var express = require("express");
var fs = require("fs");
var path = require("path");
var Busboy = require("busboy");
var swaggerUi = require("swagger-ui-express");
const debug = require("debug");
var router = express.Router();

var config = require("../../config");
var apiAuth = require("../../apiAuth");
var swaggerDocument = require("../swagger/swagger-file-storage.json");

router.use("/", apiAuth.handleToken(config.STORAGE_API_NAME));
router.get("/swagger.json", (req, res) => res.send(swaggerDocument));
router.use("/api-docs", swaggerUi.serve, (...args) =>
  swaggerUi.setup(swaggerDocument)(...args)
);
router.get("/login", apiAuth.login(config.STORAGE_API_NAME));

var EBSIcassandra = require("./modules/cassandra");
var EBSImongo = require("./modules/mongo");
var EBSIglusterfs = require("./modules/gluster-fs");

const NO_DB_SPECIFIED = "no db specified";
const DB_SELECTION_ERROR = "db selection error";
const MAX_SIZE = 16 * 1024 * 1024 - 1000;

const databases = [
  { name: "mongo", enabled: config.mongodb ? true : false },
  { name: "cassandra", enabled: config.cassandra ? true : false },
  { name: "gluster-fs", enabled: config.glusterfs ? true : false }
];

function listNameDatabases() {
  var text = "";
  for (var i in databases)
    text += databases[i].name + (i == databases.length - 1 ? "" : ", ");
  return text;
}

function verifyDatabase(req, res, next) {
  var database = req.params.database;
  if (!database) {
    next(NO_DB_SPECIFIED);
    return;
  }

  var selDB = databases.find(d => {
    return d.name === database;
  });

  if (!selDB) {
    res
      .status(404)
      .send(
        `Incorrect 'database'. Supported databases: ${listNameDatabases()}.`
      );
    next(DB_SELECTION_ERROR);
    return;
  }

  if (!selDB.enabled) {
    res.status(404).send(`Store in ${selDB.name} is disabled`);
    next(DB_SELECTION_ERROR);
    return;
  }

  next(database);
}

function hashValidation(req, res, next) {
  if (!req.params.hash) {
    res.status(400).send("No hash defined in the query");
    return;
  }

  if (typeof req.params.hash !== "string" || req.params.hash.length != 66) {
    res.status(400).send("Incorrect hash format");
    return;
  }

  next();
}

function store(req, res) {
  var busboy = new Busboy({ headers: req.headers });
  var saveTo = null;
  var filename = null;
  var public_key = null;
  var database = null;
  var file_saved = false;
  var busboy_finished = false;
  busboy.on("file", function(fieldname, file, _filename) {
    if (!_filename) {
      res.status(400).send("No filename defined");
      return;
    }
    filename = path.basename(_filename);
    var tempFile =
      Math.random()
        .toString(36)
        .substring(2) + ".tmp";
    saveTo = path.join(".", tempFile);
    console.log("Uploading " + filename);
    debug("file-storage")(`Saving in tempfile: ${saveTo}`);
    var fstream = fs.createWriteStream(saveTo);
    file.pipe(fstream);

    fstream.on("close", () => {
      file_saved = true;
      processRequest();
    });
  });
  busboy.on("field", function(fieldname, val) {
    switch (fieldname) {
      case "public_key":
        public_key = val;
        debug("file-storage")(`public_key: ${public_key}`);
        break;
      case "database":
        database = val;
        debug("file-storage")(`database: ${database}`);
        break;
      default:
        console.log(`Fieldname ${fieldname} not supported`);
    }
  });
  busboy.on("finish", function() {
    busboy_finished = true;
    processRequest();
  });

  var processRequest = () => {
    if (!file_saved || !busboy_finished) return;
    /*var is_address = new Web3().utils.isAddress(public_key)
    if(!is_address){
      res.status(400).send("Please provide a correct public key in the request")
      fs.unlink(saveTo)
      return
    }*/
    req.tempfile = saveTo;
    req.public_key = "0x0000000000000000000000000000000000000000";
    req.filename = filename;
    if (!req.params) req.params = {};
    req.params.database = database;

    var removeTempFile = function() {
      fs.unlink(req.tempfile, err => {
        if (err) {
          console.log(`Error when removing tempfile ${req.tempfile}`);
          console.log(err);
        }
      });
    };

    var size = fs.statSync(req.tempfile)["size"];
    if (size > MAX_SIZE) {
      res.status(400).send("File to insert too large. Max size: " + MAX_SIZE);
      removeTempFile();
      return;
    }

    verifyDatabase(req, res, database => {
      if (database === DB_SELECTION_ERROR) {
        removeTempFile();
        return;
      }

      switch (database) {
        case "mongo":
          EBSImongo.storeFile(req, res, removeTempFile);
          break;
        case "cassandra":
          var ebsi_cassandra = new EBSIcassandra({ client: req.cassandra });
          ebsi_cassandra.store(req, res, removeTempFile);
          break;
        case "gluster-fs":
          var ebsi_glusterfs = new EBSIglusterfs({
            path: config.glusterfs.path
          });
          ebsi_glusterfs.storeFile(req, res, removeTempFile);
          break;
        default:
          throw new Error(
            `The handle for database '${database}' has not been implemented`
          );
      }
    });
  };

  return req.pipe(busboy);
}

function read(req, res) {
  var handleIfNotFound = found => {
    if (!found) {
      res.status(404).send("File not found");
      debug("file-storage")("File not found");
    }
  };

  hashValidation(req, res, () => {
    verifyDatabase(req, res, database => {
      if (database === DB_SELECTION_ERROR) return;

      if (database === NO_DB_SPECIFIED) {
        const ebsi_glusterfs = new EBSIglusterfs({
          path: config.glusterfs.path
        });
        const ebsi_cassandra = new EBSIcassandra({ client: req.cassandra });

        // try first reading in gluster fs
        debug("file-storage")("Searching in gluster-fs");
        ebsi_glusterfs.readFile(req, res, found => {
          if (found) return;
          debug("file-storage")("File not found");

          // next try reading in cassandra
          debug("file-storage")("Searching in cassandra");
          ebsi_cassandra.read(req, res, found => {
            if (found) return;
            debug("file-storage")("File not found");

            // next try reading in mongo
            debug("file-storage")("Searching in mongo");
            EBSImongo.readFile(req, res, handleIfNotFound);
          });
        });
        return;
      }

      switch (database) {
        case "mongo":
          EBSImongo.readFile(req, res, handleIfNotFound);
          break;
        case "cassandra":
          var ebsi_cassandra = new EBSIcassandra({ client: req.cassandra });
          ebsi_cassandra.read(req, res, handleIfNotFound);
          break;
        case "gluster-fs":
          var ebsi_glusterfs = new EBSIglusterfs({
            path: config.glusterfs.path
          });
          ebsi_glusterfs.readFile(req, res, handleIfNotFound);
          break;
        default:
          throw new Error(
            `The handle for database '${database}' has not been implemented`
          );
      }
    });
  });
}

function _delete(req, res) {
  verifyDatabase(req, res, database => {
    if (database === DB_SELECTION_ERROR) return;
    if (database === NO_DB_SPECIFIED) return;

    switch (database) {
      case "mongo":
        EBSImongo.deleteFile(req, res);
        break;
      case "cassandra":
        var ebsi_cassandra = new EBSIcassandra({ client: req.cassandra });
        ebsi_cassandra._delete(req, res);
        break;
      case "gluster-fs":
        var ebsi_glusterfs = new EBSIglusterfs({
          path: config.glusterfs.path
        });
        ebsi_glusterfs.deleteFile(req, res);
        break;
      default:
        throw new Error(
          `The handle for database '${database}' has not been implemented`
        );
    }
  });
}

function auth(req, res, next) {
  if (!req.user) {
    res.status(401).send("Not authenticated user");
    debug("login")("Not authenticated user");
    return;
  }

  if (req.user.aud === config.STORAGE_API_NAME) next();
  else {
    res.status(403).send("Unauthorized access");
    debug("login")("Unauthorized access");
  }
}

router.post("/store", auth, store);
router.post("/delete/:hash/:database", auth, hashValidation, _delete);
router.get("/:hash", auth, read);
router.get("/:hash/:database", auth, read);

module.exports = router;
