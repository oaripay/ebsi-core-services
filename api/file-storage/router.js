const express = require("express");
const path = require("path");
const fs = require("fs");
const Busboy = require("busboy");
const { v4: uuidv4 } = require('uuid');

const auth = require("../../auth");
const logger = require("../../logger");
const { BadRequestError, TooLargeError } = require("../../errors");
const controller = require("./controller");

const router = express.Router();

const MAX_SIZE = 16 * 1024 * 1024 - 1000;
const TIMEOUT_UPLOAD_MS = 60000;

function saveInTempFile(req) {
  return new Promise((resolve, reject) => {
    const busboy = new Busboy({ headers: req.headers });
    const tempFile = uuidv4() + ".tmp";
    let filename = null;

    busboy.on("file", function (fieldname, file, _filename) {
      if (!_filename)
        throw new BadRequestError("No filename defined");
      filename = path.basename(_filename);

      const fstream = fs.createWriteStream(tempFile);
      file.pipe(fstream);

      fstream.on("close", () => {
        resolve({filename, tempFile});
      });
    });

    const timer = setTimeout(() => {
        clearTimeout(timer);
        throw new TooLargeError(`Timeout of ${TIMEOUT_UPLOAD_MS} during the upload`);
      }, TIMEOUT_UPLOAD_MS);
  });
}

router.use(auth.handleToken);

// Get list of files
router.get("/files", async (req, res, next) => {
  try {
    const {store, query} = req;
    const result = await getListFiles({store, query});
    res.send(result);
  } catch (error) {
    next(error);
  }
});

// Store file
router.post("/files", async (req, res, next) => {
  let filename, tempFile;
  try {
    {filename, tempFile} = await saveInTempFile(req);
    const size = fs.statSync(tempFile)["size"];
    if (size > MAX_SIZE)
      throw new TooLargeError(`Payload too large. Max size allowed ${MAX_SIZE} bytes`);

    const result = await controller.storeFile({
      store: req.store,
      filename,
      file: tempFile,
    });
    res.status(201).send(result);
    fs.unlinkSync(tempFile);
  } catch (error) {
    try {
      if (tempFile) fs.unlinkSync(tempFile);
    } catch (error) {
      logger.error(error);
    }
    next(error);
  }
});

// Read file by hash
router.get("/files/:hash", async (req, res, next) => {
  try {
    const { hash } = req.params;
    const record = await controller.readFile({ store, hash })
    res.writeHead(200, {
      "Content-Type": "application/" + path.extname(record.filename),
      "Content-disposition": "attachment;filename=" + record.filename,
      "Content-Length": record.data.length
    });
    res.end(Buffer.from(record.data, "binary"));
  } catch (error) {
    next(error);
  }
});

// Delete file by hash
router.delete("/files/:hash", async (req, res, next) => {
  try {
    const { hash } = req.params;
    await controller.deleteFile({ store, hash })
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;



