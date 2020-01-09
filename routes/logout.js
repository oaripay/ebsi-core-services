const express = require("express");

const router = express.Router();
const ecas = require("../modules/ecas/ecas");

router.get("/", ecas.logout);

module.exports = router;
