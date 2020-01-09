const express = require("express");

const router = express.Router();
const ecas = require("../modules/ecas/ecas");

router.get("/", ecas.bounce_redirect, (req, res) => {
  res.json({ ecas_user: req.session[ecas.session_name] });
});

module.exports = router;
