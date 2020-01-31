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
// var hasToken=false;

router.post('/check', (req, res) => {
  console.log('check index2', req.body);

  if (req && req.body) {
    console.log('1/ avant: ', req.app.settings.settings);
    //     hasToken=true;

    req.app.settings.settings.jwt = req.body.Jwt;
    req.app.settings.settings.did = req.body.Did;


    const payload = parseJwt(req.body.Jwt);
    //     console.log('*=*=* payload *=*=*',payload);

    //     var expired = payload.exp * 1000 < Date.now();

    if (isTokenExpired(payload)) {
      console.log('JWT expired on: \t', moment.unix(payload.exp).format(), '\t, will be redirect!!!');
      req.app.settings.settings.jwt = '';
      req.app.settings.settings.did = '';
    }

    console.log('2/ apres : ', req.app.settings.settings);
  }
});

function isTokenExpired(payload) {
  return payload.exp * 1000 < Date.now();
}

//--
function parseJwt(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = atob(base64);
  // console.log(' #> ',jsonPayload)
  return JSON.parse(jsonPayload);
}
//--

// router.get('/', fileProcessing.getAllDocument);
// router.get('/', ecas.bounce, fileProcessing.getAllDocument);

router.post('/document', fileProcessing.getDocument);

router.post('/verify', fileProcessing.verify);

router.post('/verifyfile', fileProcessing.verifyFile);

// router.post('/fileupload', isLoggedIn, fileProcessing.upload);
router.post('/fileupload', fileProcessing.upload);


/*
router.get('/', (req, res) => {
  // other file

  console.log('andranao', req.app.get('settings'));
  console.log('nety euuuuuuuuuu fuuuuuuuuuuu tato am / ');
  if (req.app.settings.settings.jwt) {
    console.log('with JWT -1- *********************',req.app.settings.settings.jwt);
      res.render('index', {
    title: config.titleEuFunding,
    user: 'me',
    allDocument: [],
    hasToken: true,
    pathname: '/demo/eu-funding',
    fileupload: '/demo/eu-funding/fileupload',
    document: '/demo/eu-funding/document',
    verify: '/demo/eu-funding/verify'
  });
  }else{
    console.log('NOOOONNNNNN jwt -2- *********************',req.app.settings.settings.jwt);
      res.render('index', {
    title: config.titleEuFunding,
    user: 'me',
    allDocument: [],
    hasToken: false,
    pathname: '/demo/eu-funding',
    fileupload: '/demo/eu-funding/fileupload',
    document: '/demo/eu-funding/document',
    verify: '/demo/eu-funding/verify'
  });
  }

});
*/

router.get('/nojwt', fileProcessing.noToken);

router.get('/', fileProcessing.getAllDocument);
// router.get('/', isLoggedIn, fileProcessing.getAllDocument);

// router.post('/check', fileProcessing.checkToken);

router.post('/demo/eu-funding/check', fileProcessing.checkToken);


router.post('/receive-hash-done', fileProcessing.receivehash);

router.get('/receive-hash', fileProcessing.loading);


function isLoggedIn(req, res, next) {
//   console.log('*********** login **********', req);
  console.log('***********check login**********',req.app.settings.settings.jwt);
  if(req.app.settings.settings.jwt){
      return next();
  }
  // req.session.oldURL = req.url;
  res.redirect('/demo/eu-funding/nojwt');
}

module.exports = router;
