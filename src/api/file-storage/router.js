const express = require("express");
const path = require("path");
const fs = require("fs");
const Busboy = require("busboy");
const { v4: uuidv4 } = require("uuid");

const logger = require("../../logger");
const { BadRequestError, PayloadTooLargeError } = require("../../errors");
const controller = require("./controller");

const router = express.Router({ mergeParams: true });

const MAX_SIZE = 16 * 1024 * 1024 - 1000;
const TIMEOUT_UPLOAD_MS = 60000;

function saveInTempFile(req) {
  return new Promise((resolve, reject) => {
    let busboy;
    try {
      busboy = new Busboy({ headers: req.headers });
    } catch (error) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: error.message,
      });
    }
    const tempFile = `${uuidv4()}.tmp`;
    let filename = null;
    let receivingFile = false;

    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(
        new PayloadTooLargeError(PayloadTooLargeError.defaultTitle, {
          detail: `Timeout of ${TIMEOUT_UPLOAD_MS} during the upload`,
        })
      );
    }, TIMEOUT_UPLOAD_MS);

    busboy.on("file", (fieldname, file, _filename) => {
      receivingFile = true;
      if (!_filename)
        throw new BadRequestError(BadRequestError.defaultTitle, {
          detail: "No filename defined",
        });
      filename = path.basename(_filename);
      logger.info(`Uploading file ${filename} in temp file ${tempFile}`);

      const fstream = fs.createWriteStream(tempFile);
      file.pipe(fstream);

      fstream.on("close", () => {
        resolve({ filename, tempFile });
        clearTimeout(timer);
      });
    });

    busboy.on("finish", () => {
      if (!receivingFile) {
        reject(
          new BadRequestError(BadRequestError.defaultTitle, {
            detail: "No file received in the body",
          })
        );
        clearTimeout(timer);
      }
    });

    req.pipe(busboy);
  });
}

// Get list of files
router.get("/", async (req, res, next) => {
  try {
    const { store, query } = req;
    const result = await controller.getListFiles(store, query);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

// Store file
router.post("/", async (req, res, next) => {
  let filename;
  let tempFile;
  try {
    // Receive file and save it locally
    ({ filename, tempFile } = await saveInTempFile(req));

    const { size } = fs.statSync(tempFile);
    if (size > MAX_SIZE)
      throw new PayloadTooLargeError(PayloadTooLargeError.defaultTitle, {
        detail: `Payload too large. Max size allowed ${MAX_SIZE} bytes`,
      });

    const result = await controller.storeFile(req.store, filename, tempFile);
    res.status(201).send(result);
    fs.unlinkSync(tempFile);
  } catch (error) {
    try {
      if (tempFile) fs.unlinkSync(tempFile);
    } catch (errorUnlink) {
      logger.error(errorUnlink);
    }
    next(error);
  }
});

// Read file by hash
router.get("/:hash", async (req, res, next) => {
  try {
    const { hash } = req.params;
    const record = await controller.readFile(req.store, hash);
    res.writeHead(200, {
      "Content-Type": `application/${path
        .extname(record.filename)
        .replace(".", "")}`,
      "Content-disposition": `attachment; filename=${record.filename}`,
      "Content-Length": record.data.length,
    });
    res.end(Buffer.from(record.data, "binary"));
  } catch (error) {
    next(error);
  }
});

// Delete file by hash
router.delete("/:hash", async (req, res, next) => {
  try {
    const { hash } = req.params;
    await controller.deleteFile(req.store, hash);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
