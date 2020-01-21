const express = require('express');

const router = express.Router();
// const ecas = require('../modules/ecas/ecas');
// var path = require('path');
const fileProcessing = require('../service/fileProcessing');
// var csrf = require('csurf');
// var csrfProtection = csrf();
// router.use(csrfProtection);
const config = require('../service/conf');

// var hasToken=false;

router.post('/check', (req, res) => {
  //   console.log('check',res);
  console.log('check 2', req.body); // ,' ; ',req.session);
  //   req.body.value={Jwt:'jwtjwt',Did:'diddid'};
  
  if (req && req.body) {
    console.log('1/ avant: ', req.app.settings.settings);
    //     hasToken=true;

    req.app.settings.settings.jwt = req.body.Jwt;
    req.app.settings.settings.did = req.body.Did;
    console.log('2/ apres : ', req.app.settings.settings);

  }


});


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

router.get('/receive-hash', fileProcessing.receivehash);

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
