const express = require('express');
// const atob = require('atob');
const router = express.Router();
// const ecas = require('../modules/ecas/ecas');
// var path = require('path');
const fileProcessing = require('../service/fileProcessing');
// var csrf = require('csurf');
// var csrfProtection = csrf();
// router.use(csrfProtection);
// const config = require('../service/conf');
// const moment = require('moment');
// const _ = require('lodash');


router.post('/document', fileProcessing.getDocument);

router.post('/verify', fileProcessing.verify);

router.post('/verifyfile', fileProcessing.verifyFile);

router.post('/fileupload', fileProcessing.upload);

router.get('/nojwt', fileProcessing.noToken);

router.post('/', fileProcessing.getAllDocument);
router.get('/', fileProcessing.goEuf);


router.post('/receive-hash-done', fileProcessing.receivehash);
router.get('/receive-hash', fileProcessing.receivehash);


module.exports = router;
