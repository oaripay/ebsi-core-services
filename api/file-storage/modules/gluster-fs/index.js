const fs = require("fs");
const path = require("path");
const ethers = require("ethers");

function getPath(dir, publicKey, hash, ext) {
  return `${dir}/${publicKey}/${hash}${ext}`;
}

function getPaths(dir, publicKey, hash) {
  return {
    path_file: getPath(dir, publicKey, hash, ".dat"),
    path_metadata: getPath(dir, publicKey, hash, ".metadata"),
    path_folder: `${dir}/${publicKey}`,
  };
}

function EBSIglusterfs(options) {
  this.directory_path = options.path;
}

EBSIglusterfs.prototype.storeFile = (req, res, next) => {
  if (!req.tempfile || !req.publicKey || !req.filename) {
    throw new Error("The request need tempfile, publicKey and filename");
  }

  const data = fs.readFileSync(req.tempfile);
  const hash = ethers.utils.keccak256(data);
  // var publicKey = req.publicKey.toLowerCase()
  const publicKey = "0x0000000000000000000000000000000000000000";

  const paths = getPaths(this.directory_path, publicKey, hash);

  if (fs.existsSync(paths.path_file)) {
    res.status(400).send("This file is already stored");
    next();
  } else {
    // create user folder if it doesn't exist
    if (!fs.existsSync(paths.path_folder)) {
      fs.mkdirSync(paths.path_folder);
    }

    const metadata = {
      filename: req.filename,
    };
    const contentMetadata = JSON.stringify(metadata);

    fs.writeFile(paths.path_metadata, contentMetadata, (err) => {
      if (err) {
        res.status(500).send("Internal error");
        next();
        return;
      }
      fs.writeFile(paths.path_file, data, (error) => {
        if (error) {
          res.status(500).send("Internal error");
          next();
          return;
        }
        res.send({ message: "File stored", hash });
        next();
      });
    });
  }
};

EBSIglusterfs.prototype.readFile = (req, res, next) => {
  // var publicKey = req.user.publicKey.toLowerCase()
  const publicKey = "0x0000000000000000000000000000000000000000";
  const paths = getPaths(this.directory_path, publicKey, req.params.hash);

  if (fs.existsSync(paths.path_file)) {
    const data = fs.readFileSync(paths.path_file);
    const metadata = JSON.parse(fs.readFileSync(paths.path_metadata));

    res.writeHead(200, {
      "Content-Type": `application/${path.extname(metadata.filename)}`,
      "Content-disposition": `attachment;filename=${metadata.filename}`,
      "Content-Length": data.length,
    });
    res.end(Buffer.from(data, "binary"));
    next(true);
  } else {
    next(false);
  }
};

EBSIglusterfs.prototype.deleteFile = (req, res) => {
  try {
    const publicKey = "0x0000000000000000000000000000000000000000";
    const paths = getPaths(this.directory_path, publicKey, req.params.hash);
    if (!fs.existsSync(paths.path_file)) {
      res.status(404).send("File not found");
      return;
    }
    fs.unlinkSync(paths.path_file);
    fs.unlinkSync(paths.path_metadata);
    res.send({ message: "File deleted" });
  } catch (error) {
    res.status(500).send("Internal error");
  }
};

module.exports = EBSIglusterfs;
