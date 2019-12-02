var express = require('express');
var router = express.Router();
var ecas = require('../modules/ecas/ecas');

router.get('/', ecas.bounce, (req, res) => {
  console.log(JSON.stringify({ ecas_user: req.session[ecas.session_name] }));

  // let userData = res.json( { ecas_user: req.session[ ecas.session_name ] });
  let username = req.session[ecas.session_name];
  let ticket = req.query.ticket;
  // console.log('\n--- req.session ---\n',req.session);
  res.render('user',
    {
      title: 'My account',
      user: username,
      ticket: ticket
    });
});

module.exports = router;
