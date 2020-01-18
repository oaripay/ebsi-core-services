const express = require('express');
const config = require('../service/conf');
const router = express.Router();
// const ecas = require('../modules/ecas/ecas');
// var path = require('path');
const fileProcessing = require('../service/fileProcessing');
// var csrf = require('csurf');
// var csrfProtection = csrf();
// router.use(csrfProtection);

// router.get('/',isLoggedIn, fileProcessing.getAllDocument);
// router.get('/', fileProcessing.getAllDocument);
router.get('/', (req, res) => {
  // other file

  console.log('settings', req.app.get('settings'));
  console.log('notary / ');
  if (req.app.settings.jwt) {
    console.log('jwt rty a');
  }
  res.render('index', {
    title: config.titleEuFunding,
    user: 'me',
    allDocument: [],
    hasToken: true,
    pathname: '/notary',
    fileupload: '/notary/fileupload',
    document: '/notary/document',
    verify: '/notary/verify'

  });
});


router.post('/check', (req, res) => {
  //   console.log('check',res);
  console.log('check 1', req.body); // ,' ; ',req.session);
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
      pathname: '/notary',
      fileupload: '/notary/fileupload',
      document: '/notary/document',
      verify: '/notary/verify'
    });
  }

  res.render('index', {
    title: config.titleEuFunding,
    user: 'me',
    allDocument: [],
    hasToken: false,
    pathname: '/notary',
    fileupload: '/notary/fileupload',
    document: '/notary/document',
    verify: '/notary/verify'
  });
});

router.post('/document', fileProcessing.getDocument);

router.post('/verify', fileProcessing.verify);

router.post('/verifyfile', fileProcessing.verifyFile);

// router.post('/fileupload', isLoggedIn, fileProcessing.upload);
router.post('/fileupload', fileProcessing.upload);

router.get('/user/fileupload', (req, res) => {
  res.redirect('/');
});
router.get('/fileupload', (req, res) => {
  console.log('nandalo tato++++++++++++++++++++++');
  res.redirect('/');
});


// function isLoggedIn(req, res, next) {
//   console.log('*********** login **********', req.test);
//   // if(req.isAuthenticated()){
//   //     return next();
//   // }
//   // req.session.oldURL = req.url;
//   res.redirect('https://app.ebsi.xyz/demo');
//   //     res.redirect('/demo');https://app.ebsi.xyz/demo
// }

module.exports = router;
