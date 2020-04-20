const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require('uuid');

const auth = require("../../auth");
const logger = require("../../logger");
const { BadRequestError, TooLargeError } = require("../../errors");
const controller = require("./controller");

const router = express.Router();

router.use(bodyParser.json({ limit: "10mb", extended: true, type: "*/*" }));

// List of key-values
router.get("/", async (req, res, next) => {

});

// Add or update a value
router.put("/:key", async (req, res, next) => {

});

// Get object by key
router.get("/:key", async (req, res, next) => {

});

// Delete object by key
router.delete("/:key", async (req, res, next) => {

});

// Apply a patch or add an item to an existing value
router.patch("/:key", async (req, res, next) => {

});

module.exports = router;
