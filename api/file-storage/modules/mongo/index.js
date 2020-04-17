const fs = require("fs");
var path = require("path");
var ethers = require("ethers");
var File = require("./models/File");

function storeFile(req, res, next) {
  if (!req.tempfile || !req.public_key || !req.filename) {
    throw new Error("The request need tempfile, public_key and filename");
  }

  var data = fs.readFileSync(req.tempfile);
  var hash = ethers.utils.keccak256(data);
  // var public_key = req.public_key.toLowerCase()
  var public_key = "0x0000000000000000000000000000000000000000";

  File.findOne({ hash: hash, public_key: public_key }, function(err, _file) {
    if (_file) {
      res.status(400).send("This file is already stored");
      next();
    } else {
      var file = new File({
        public_key: public_key,
        hash: hash,
        filename: req.filename,
        data: data,
        metadata: {}
      });
      file.save(function(err) {
        if (err) {
          console.log(err);
          res.status(500).send("Internal error");
        } else {
          res.send({ message: "File stored", hash: hash });
        }
        next();
      });
    }
  });
}

function readFile(req, res, next) {
  //var public_key = req.user.public_key.toLowerCase()
  var public_key = "0x0000000000000000000000000000000000000000";
  File.findOne({ hash: req.params.hash, public_key: public_key }, function(
    err,
    file
  ) {
    if (file) {
      res.writeHead(200, {
        "Content-Type": "application/" + path.extname(file.filename),
        "Content-disposition": "attachment;filename=" + file.filename,
        "Content-Length": file.data.length
      });
      res.end(Buffer.from(file.data, "binary"));
      next(true);
    } else {
      next(false);
    }
  });
}

function deleteFile(req, res) {
  var public_key = "0x0000000000000000000000000000000000000000";
  var hash = req.params.hash;
  var query = { hash, public_key };
  File.findOne(query, function(err, file) {
    if (!file) {
      res.status(404).send("File not found");
      return;
    }
    File.deleteOne(query, function(err) {
      if (err) {
        console.log(err);
        res.status(500).send("Internal Error");
        return;
      }
      res.send({ message: "File deleted" });
    });
  });
}

module.exports = {
  storeFile,
  readFile,
  deleteFile
};
