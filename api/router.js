const express = require("express");
const controller = require("./controller");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await controller.getListRecords(req.query);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:hash", async (req, res, next) => {
  try {
    const result = await controller.getRecord(req.params.hash);
    res.send(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
