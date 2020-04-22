const express = require("express");
const bodyParser = require("body-parser");

const controller = require("./controller");

const router = express.Router();

router.use(bodyParser.json({ limit: "10mb", extended: true, type: "*/*" }));

// List of key-values
router.get("/", async (req, res, next) => {
  try {
    const result = await controller.getListKeys(req.store, req.query);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

// Add or update a value
router.put("/:key", async (req, res, next) => {
  try {
    const { key } = req.params;
    const value = req.body;
    const { type, result } = await controller.setKey(req.store, key, value);
    const status = type === "insert" ? 200 : 201;
    res.status(status).send(result);
  } catch (error) {
    next(error);
  }
});

// Get object by key
router.get("/:key", async (req, res, next) => {
  try {
    const { key } = req.params;
    const result = await controller.getKey(req.store, key);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

// Delete object by key
router.delete("/:key", async (req, res, next) => {
  try {
    const { key } = req.params;
    await controller.deleteKey(req.store, key);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Apply a patch or add an item to an existing value
router.patch("/:key", async (req, res, next) => {
  try {
    const { key } = req.params;
    const result = await controller.patchKey(req.store, key, req.body);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
