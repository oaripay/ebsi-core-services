const fs = require("fs");
var path = require("path");
var ethers = require("ethers");

function getPath(dir, public_key, hash, ext) {
  return dir + "/" + public_key + "/" + hash + ext;
}

function getPaths(dir, public_key, hash) {
  return {
    path_file: getPath(dir, public_key, hash, ".dat"),
    path_metadata: getPath(dir, public_key, hash, ".metadata"),
    path_folder: dir + "/" + public_key
  };
}

function EBSIglusterfs(options) {
  this.directory_path = options.path;
}

EBSIglusterfs.prototype.storeFile = function(req, res, next) {
  if (!req.tempfile || !req.public_key || !req.filename) {
    throw new Error("The request need tempfile, public_key and filename");
  }

  var data = fs.readFileSync(req.tempfile);
  var hash = ethers.utils.keccak256(data);
  // var public_key = req.public_key.toLowerCase()
  var public_key = "0x0000000000000000000000000000000000000000";

  var paths = getPaths(this.directory_path, public_key, hash);

  if (fs.existsSync(paths.path_file)) {
    res.status(400).send("This file is already stored");
    next();
  } else {
    // create user folder if it doesn't exist
    if (!fs.existsSync(paths.path_folder)) {
      fs.mkdirSync(paths.path_folder);
    }

    var metadata = {
      filename: req.filename
    };
    var content_metadata = JSON.stringify(metadata);

    fs.writeFile(paths.path_metadata, content_metadata, err => {
      if (err) {
        console.log(err);
        res.status(500).send("Internal error");
        next();
        return;
      }
      fs.writeFile(paths.path_file, data, err => {
        if (err) {
          console.log(err);
          res.status(500).send("Internal error");
          next();
          return;
        }
        res.send({ message: "File stored", hash: hash });
        next();
      });
    });
  }
};

EBSIglusterfs.prototype.readFile = function(req, res, next) {
  // var public_key = req.user.public_key.toLowerCase()
  var public_key = "0x0000000000000000000000000000000000000000";
  var paths = getPaths(this.directory_path, public_key, req.params.hash);

  if (fs.existsSync(paths.path_file)) {
    var data = fs.readFileSync(paths.path_file);
    var metadata = JSON.parse(fs.readFileSync(paths.path_metadata));

    res.writeHead(200, {
      "Content-Type": "application/" + path.extname(metadata.filename),
      "Content-disposition": "attachment;filename=" + metadata.filename,
      "Content-Length": data.length
    });
    res.end(Buffer.from(data, "binary"));
    next(true);
  } else {
    next(false);
  }
};

EBSIglusterfs.prototype.deleteFile = function(req, res) {
  try {
    var public_key = "0x0000000000000000000000000000000000000000";
    var paths = getPaths(this.directory_path, public_key, req.params.hash);
    if (!fs.existsSync(paths.path_file)) {
      res.status(404).send("File not found");
      return;
    }
    fs.unlinkSync(paths.path_file);
    fs.unlinkSync(paths.path_metadata);
    res.send({ message: "File deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal error");
  }
};

module.exports = EBSIglusterfs;
