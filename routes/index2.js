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
  if (req.body && req.body.value) {
    console.log('1/ avant: ', req.app.settings);
    //     hasToken=true;
    req.app.settings.jwt = req.body.value.Jwt;
    req.app.settings.did = req.body.value.Did;
    console.log('2/ apres : ', req.app.settings);
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
    //   }else{
    //     hasToken=true;
    //     console.log('deux sssssssssssssssssssss')
  }
  //   res.end();
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
});


// router.get('/', fileProcessing.getAllDocument);
// router.get('/', ecas.bounce, fileProcessing.getAllDocument);

router.post('/document', fileProcessing.getDocument);

router.post('/verify', fileProcessing.verify);

router.post('/verifyfile', fileProcessing.verifyFile);

// router.post('/fileupload', isLoggedIn, fileProcessing.upload);
router.post('/fileupload', fileProcessing.upload);

router.get('/', (req, res) => {
  // other file

  console.log('andranao', req.app.get('settings'));
  console.log('nety euuuuuuuuuu fuuuuuuuuuuu tato am / ');
  if (req.app.settings.jwt) {
    console.log('jwt rty a');
  }
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
});
// router.post('/fileupload', ecas.bounce, fileProcessing.upload);

// router.get('/user/fileupload', (req, res) => {
//   res.redirect('/');
// });
// router.get('/fileupload', (req, res) => {
//   console.log('nandalo tato++++++++++++++++++++++')
//   res.redirect('/');
// });


// function isLoggedIn(req, res, next) {
//   console.log('*********** login **********', req);
//   // if(req.isAuthenticated()){
//   //     return next();
//   // }
//   // req.session.oldURL = req.url;
//   res.redirect('/demo');
// }

module.exports = router;
