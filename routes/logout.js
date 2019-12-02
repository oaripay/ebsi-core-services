var express = require('express');
var router = express.Router();
var ecas = require('../modules/ecas/ecas');

router.get('/', ecas.logout);

module.exports = router;