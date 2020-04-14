const express = require("express");
const bodyParser = require("body-parser");

const auth = require("./auth");
const controller = require("./controller");

const router = express.Router();

router.use(bodyParser.json({ limit: "10mb", extended: true, type: "*/*" }));
router.post("/", auth.handleToken, async (req, res, next) => {
  let result;
  try {
    result = await controller.besuRPC(req.body, req.authenticated);
  } catch (error) {
    next(error);
  }
  res.send(result);
});

module.exports = router;
