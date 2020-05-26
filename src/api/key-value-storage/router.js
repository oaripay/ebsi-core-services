const express = require("express");
const bodyParser = require("body-parser");

const { BadRequestError } = require("../../errors");
const controller = require("./controller");

const router = express.Router();

const opts = {
  limit: "50mb",
  extended: true,
};

router.use((req, res, next) => {
  if (!req.get("content-type")) {
    next();
    return;
  }
  if (
    !req.is("text/plain") &&
    !req.is("application/json") &&
    !req.is("application/*json") &&
    !req.is("application/*+json")
  ) {
    next(
      new BadRequestError(
        `The content type ${req.get("content-type")} is not supported`
      )
    );
    return;
  }
  next();
});

router.use(bodyParser.json({ type: "application/json", ...opts }));
router.use(bodyParser.json({ type: "application/*json", ...opts }));
router.use(bodyParser.json({ type: "application/*+json", ...opts }));
router.use((error, req, res, next) => {
  next(
    new BadRequestError(
      "The body is defined for 'application/*json' but it cannot be parsed as JSON. Try it defining body as 'text/plain'"
    )
  );
});

router.use(bodyParser.text({ type: "text/plain", ...opts }));

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
