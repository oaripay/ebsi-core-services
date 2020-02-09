const express = require('express');
const atob = require('atob');
const router = express.Router();
// const ecas = require('../modules/ecas/ecas');
// var path = require('path');
const fileProcessing = require('../service/fileProcessing');
// var csrf = require('csurf');
// var csrfProtection = csrf();
// router.use(csrfProtection);
const config = require('../service/conf');
const moment = require('moment');
const _ = require('lodash');
// var hasToken=false;

/*
router.post('/check', checkLogin);

function checkLogin(req) {
  console.log('checkLogin index2 req.body ', req.body);

  if (req && req.body) {
    //     console.log('1/ avant: ', req.app.settings.settings);
    //     console.log('1/ avant: ', req.app.settings.settings);
    //     hasToken=true;

    req.app.settings.settings.jwt = req.body.Jwt;
    req.app.settings.settings.did = req.body.Did;

    console.log('*=*=* req.body.Jwt *=*=*', req.body.Jwt);
    const payload = { exp: 0 };
    if (req.body && req.body.Jwt) {
      _.assign(payload, parseJwt(req.body.Jwt));
    }

    console.log('*=*=* payload *=*=*', payload);

    //     var expired = payload.exp * 1000 < Date.now();

    if (isTokenExpired(payload)) {
      console.log('JWT expired on: \t', moment.unix(payload.exp).format(), '\t, will be redirect!!!');
      req.app.settings.settings.jwt = '';
      req.app.settings.settings.did = '';
    }

    //     console.log('2/ apres : ', req.app.settings.settings);
    console.log('checkLogin index2 req.app.settings.settings ', req.app.settings.settings);
  }
}


function isTokenExpired(payload) {
  return payload.exp * 1000 < Date.now();
}

//--
function parseJwt(token) {
//   console.log(!!token);
  var base64Url = token.split('.')[1];
  //   var base64Url = !!token ?  : token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = atob(base64);
  // console.log(' #> ',jsonPayload)
  return JSON.parse(jsonPayload);
}
//--
*/

router.post('/document', fileProcessing.getDocument);

router.post('/verify', fileProcessing.verify);

router.post('/verifyfile', fileProcessing.verifyFile);

router.post('/fileupload', fileProcessing.upload);

router.get('/nojwt', fileProcessing.noToken);

router.post('/', fileProcessing.getAllDocument);
router.get('/', fileProcessing.goEuf);

// router.post('/demo/eu-funding/check', checkLogin);

router.post('/receive-hash-done', fileProcessing.receivehash);
// router.get('/receive-hash', fileProcessing.loading);
router.get('/receive-hash', fileProcessing.receivehash);


module.exports = router;
