const express = require("express");
const bodyParser = require("body-parser");

const auth = require("./auth");
const controller = require("./controller");

const router = express.Router();

router.use(bodyParser.json({ limit: "10mb", extended: true, type: "*/*" }));
router.post("/", auth.handleToken, async (req, res) => {
  const result = await controller.besuRPC(req.body, req.authenticated);
  res.send(result);
});

module.exports = router;
