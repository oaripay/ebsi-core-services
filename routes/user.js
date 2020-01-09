const express = require("express");

const router = express.Router();
const ecas = require("../modules/ecas/ecas");

router.get("/", ecas.bounce, (req, res) => {
  console.log(JSON.stringify({ ecas_user: req.session[ecas.session_name] }));

  // let userData = res.json( { ecas_user: req.session[ ecas.session_name ] });
  const username = req.session[ecas.session_name];
  const { ticket } = req.query;
  // console.log('\n--- req.session ---\n',req.session);
  res.render("user", {
    title: "My account",
    user: username,
    ticket
  });
});

module.exports = router;
