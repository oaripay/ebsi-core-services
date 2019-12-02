var express = require('express');
var router = express.Router();
var ecas = require('../modules/ecas/ecas');
//var path = require('path');
var fileProcessing = require('../service/fileProcessing');



router.get('/', ecas.bounce, fileProcessing.getAllDocument);

router.post('/document', fileProcessing.getDocument);

router.post('/verify', fileProcessing.verify);

router.post('/verifyfile', fileProcessing.verifyFile);

router.post('/fileupload', ecas.bounce, fileProcessing.upload);

router.get('/user/fileupload', function(req, res, next) {
    res.redirect('/');
});
router.get('/fileupload', function(req, res, next) {
    res.redirect('/');
});


module.exports = router;