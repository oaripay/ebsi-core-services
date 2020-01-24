const _ = require('lodash');
const jose = require('jose');
// const { JWK } = require('jose')
const path = require('path');
const axios = require('axios');
const Web3 = require('web3');
const fs = require('fs');
const FormData = require('form-data');
const moment = require('moment');
const ecas = require('../modules/ecas/ecas');
const config = require('./conf');

let fileToStore, fileLabel;

var euFundingConf = {
  pathname: '/demo/eu-funding',
  fileupload: '/demo/eu-funding/fileupload',
  document: '/demo/eu-funding/document',
  verify: '/demo/eu-funding/verify',
  verifyfile: '/demo/eu-funding/verifyfile'
};

var notaryConf = {
  pathname: '/notary',
  fileupload: '/notary/fileupload',
  document: '/notary/document',
  verify: '/notary/verify',
  verifyfile: '/notary/verifyfile',
};

// to do add switch from pathname to res

/* eslint-disable consistent-return, no-use-before-define, camelcase, prefer-const */

async function besuLogin() {
  console.log('--------------------- login besu login ---------------------');

  const privKey = config.private_key;
  const payload = { iss: 'ebsi-notary', aud: 'ebsi-besu' };
  const key = jose.JWK.asKey(privKey);
  const token = jose.JWT.sign(payload, key, {
    expiresIn: '15 minutes'
  });
  console.log(token);

  // try {
  const opts = { headers: { Authorization: `Bearer ${token}` } };
  const response = await axios.get(`${config.api}blockchain/besu/login/`, opts);
  // console.log(response.data);
  console.log(
    '--------------------- notary besu login ---------------------',
    response.data
  );
  return response.data.token;
}

async function storageLogin() {
  console.log('--------------------- login storage login ---------------------');

  const privKey = config.private_key;
  const payload = { iss: 'ebsi-notary', aud: 'ebsi-storage' }; // or ebsi-besu
  const key = jose.JWK.asKey(privKey);
  const token = jose.JWT.sign(payload, key, {
    expiresIn: '15 minutes'
  });
  console.log(token);


  // try {
  const opts = { headers: { Authorization: `Bearer ${token}` } };
  // const response = await axios.get(`${config.api}file-storage/login/`, opts);
  let response = await axios.get(config.api + 'file-storage/login/', opts);
  // console.log(response.data);
  console.log('--------------------- notary store login ---------------------', response.data);
  return response.data.token;
  // } catch (error) {
  //     console.log(error.response.statusCode)
  //     console.log(error.response.data)
  // }
}

function upload(req, res) {
  let sampleFile;
  let uploadPath;
  const reqPath = path.join(__dirname, '../');
  // let csrfToken = req.csrfToken();
  console.log('----------------------------------------------------\n', req.baseUrl, ' | ', req.originalUrl);
//   console.log('=========================upload=====================\n', req.app.get('settings'));
  if (
    _.isEmpty(req.app.get('settings').jwt)
    || _.isEmpty(req.app.get('settings').did)
  ) {
    // if(req.app.get('settings').jwt ==='' && req.app.get('settings').did ===''){
    res.redirect('https://app.ebsi.xyz/demo');
    //   res.redirect('/demo');https://app.ebsi.xyz/demo
    console.log('**************************** JWT and DID no*******************************************');
    return;
  }
  console.log('**************************** JWT and DID yes*******************************************');

//   console.log('=========================upload=====================\n', req.body);
  fileLabel=req.body.title;

  if (!req.files || Object.keys(req.files).length === 0) {
    console.log('No files were uploaded.');

    res.redirect('/');
    return;
  }

  sampleFile = req.files.sampleFile;

  uploadPath = `${reqPath}/in/`;

  fileToStore = uploadPath + sampleFile.name;

  sampleFile.mv(fileToStore, function (err) {
    if (err) {
      console.log('file upload error ', err);
      return res.status(500).send(err);
    }

    Promise.all([
      storeDocWithoutPubKey(req),
      getAllDocumentFromWalletByUser(req)
    ]).then(function (response) {
      if (fileToStore) {
        fs.unlink(fileToStore, function (err) {
          if (err) throw err;
          // if no error, file has been deleted successfully
        });
      }

      console.log(' file stored :::>>> ', response[0]);

      if (response[0] && response[0].ok) {
        // console.log(' file stored ::: ', response[0].ok, ' | ', response[0].message);
        let goodresult = {
          title: config.title,
          message: response[0].message,
          hash: response[0].hash,
          ok: response[0].ok,
          user: response[0].user,
          notary: response[0].notary,
          allDocument: response[1].data,
          transactionId: response[0].transactionId,
          hasToken: true
        };
        if (response[0].pathname === notaryConf.pathname) {
          _.merge(goodresult, notaryConf);
        } else {
          _.merge(goodresult, euFundingConf);
        }
        res.render('index', goodresult);
        // res.render('index', {
        //   title: config.title,
        //   message: response[0].message,
        //   hash: response[0].hash,
        //   ok: response[0].ok,
        //   user: response[0].user,
        //   notary: response[0].notary,
        //   allDocument: response[1].data,
        //   transactionId: response[0].transactionId,
        //   hasToken: true,
        //   pathname: '/demo/eu-funding',
        //   fileupload: '/demo/eu-funding/fileupload',
        //   document: '/demo/eu-funding/document',
        //   verify: '/demo/eu-funding/verify'
        // });
      } else {
        let badresult = {
          title: config.title,
          message: response[0].message,
          ok: response[0].ok,
          user: response[0].user,
          allDocument: response[1].data,
          hasToken: true
        };
        if (response[0].pathname === notaryConf.pathname) {
          _.merge(badresult, notaryConf);
        } else {
          _.merge(badresult, euFundingConf);
        }
        res.render('index', badresult);
        // res.render('index', {
        //   title: config.title,
        //   message: response[0].message,
        //   ok: response[0].ok,
        //   user: response[0].user,
        //   allDocument: response[1].data,
        //   hasToken: true
        // });
      }
    });
  });
}

async function storeDocWithoutPubKey(req) {
  console.log('=========================storeDocWithoutPubKey=====================\n', req.app.get('settings'));
  var jwtokens = req.app.get('settings');

  const filename = fileToStore;
  const database = 'cassandra'; // 'mongo', 'cassandra',  'gluster-fs'

  if (filename) {
    try {
      const fileData = fs.readFileSync(filename);

      const form = new FormData();
      form.append('my_file', fileData, filename);
      // form.append('public_key', pubKey);
      form.append('database', database);

      const token = await storageLogin();
      console.log(' >> token: ', token);
      // var token = await login();
      const storeOpts = { headers: { post: form.getHeaders() } };

      if (token) storeOpts.headers.Authorization = `Bearer ${token}`;

      // const storeResponse = await axios.post(
      //   `${config.api}file-storage/store`,
      //   form,
      //   storeOpts
      // );

      const storeResponse = await axios.post(config.api + 'file-storage/store', form, storeOpts);
      // var storeResponse = await axios.post('https://api.ebsi.xyz/file-storage/store', form, storeOpts);

      // console.log('storeDocWithoutPubKey ...\n  storeResponse.data: \n', storeResponse.data);

      const { hash } = storeResponse.data;

      console.log('storeResponse.status: ', storeResponse.status);

      const result = _.assign({}, storeResponse.data, { user: 'username' });
      // let result = _.assign({}, storeResponse.data, { user: username , csrfToken: csrfToken});

      /*      let hashMsgToSign = {
                            data: hash,
                            sender: username,
                            recipient: 'Notary DApp'
                        }; */

      // var jwtokens = req.app.get('settings');
      console.log('jwtokens 00000000000000000------------0000000000000000 var jwtokens = req.app.get', jwtokens);


      // removed from here this sign part
      if (storeResponse.status === 200) {
        // console.log('-- hashMsgToSign: ', hashMsgToSign);
        console.log('-- documentHash: ', hash);
        console.log('-- jwtokens: ', jwtokens);
        // var signResponse = await axios.post('http://localhost:3002/signTX', username);

        // var signResponse = {data: {result: 'tsz mbola misy signIt'}};
        //         const signResponse = await signIt(hash, token);

        console.log('-- signTX: -----------------------------------------------------------------------');
        var signResponse = await signTx(hash, jwtokens,fileLabel);
        console.log('-- signTX: -----------------------------------------------------------------------');

        //         console.log('-- signResponse: ', signResponse);
        console.log('-- signResponse: ', signResponse.data);
        if (signResponse.data.message === 'Message inserted') {
        // console.log('-- signResponse: ', signResponse.statusText, ' , ', signResponse.status);
          //         if (signResponse.data) {
          _.merge(result, {
            ok: true,
            notary: true,
            transactionId: signResponse.id
          });
        } else {
          _.merge(result, {
            ok: true,
            notary: false,
            transactionId: 'not signed'
          });
        }
        // _.merge(result, { ok: true, notary: true, transactionId: signResponse.data.result });
      }

      if (req.baseUrl === '/notary') {
        _.merge(result, notaryConf);
      } else {
        _.merge(result, euFundingConf);
      }
      console.log('-- result: ', result);

      return result;
    } catch (e) {
      //       console.log('not stored: ', e);

      console.log('not stored: ', e.response.status);
      console.log('not stored: ', e.response.data);
let message;
if(e.response.data && e.response.data.message){
   message=e.response.data.message
}else{
   message=e.response.data
}


      // check one day for notary
//       const errorResult = _.assign({}, {
//         ok: false, message: e.response.data, user: 'username', euFundingConf
//       });
      const errorResult = _.assign({}, {
        ok: false, message: message, user: 'username', euFundingConf
      });

      // let errorResult = _.assign({}, { ok: false, message: e.response.data, user: username ,csrfToken:csrfToken});
      // if (req.baseUrl === '/notary') {
      //   _.merge(result, notaryConf);
      // } else {
      //   _.merge(result, euFundingConf);
      // }
      return errorResult;
    }
  } else {
    // csrfToken: csrfToken,
    if (req.baseUrl === '/notary') {
      return _.merge({
        ok: false,
        message: 'missing document',
        user: 'username'
      }, notaryConf);
    }
    return _.merge({
      ok: false,
      message: 'missing document',
      user: 'username'
    }, euFundingConf);

    // return {
    //   ok: false,
    //   message: 'missing document',
    //   user: 'username'
    // };
  }
}

function getAllDocument(req, res) {
//   const username = req.session[ecas.session_name];
  // console.log('1/ getAllDocument username', username);
  console.log('- getAllDocument - jwt', req.app.settings.settings.jwt);

  getAllDocumentFromWalletByUser(req).then(function (response) {
    // to do merge conffrompathname...

    if (response && response.data) {
      console.log('documents: ', response.data.length);
      res.render('index', {
        title: config.titleEuFunding,
        user: 'username',
        allDocument: response.data,
        hasToken: true,
        pathname: '/demo/eu-funding',
        fileupload: '/demo/eu-funding/fileupload',
        document: '/demo/eu-funding/document',
        verify: '/demo/eu-funding/verify',
verifyfile: '/demo/eu-funding/verifyfile'
      });
    } else {
      res.render('index', {
        title: config.titleEuFunding,
        user: 'username',
        allDocument: [],
        hasToken: true,
        pathname: '/demo/eu-funding',
        fileupload: '/demo/eu-funding/fileupload',
        document: '/demo/eu-funding/document',
        verify: '/demo/eu-funding/verify',
verifyfile: '/demo/eu-funding/verifyfile'
      });
    }
  });
}

function noToken(req, res) {
  // console.log('***********no jwt token**********',req);
  console.log('***********no jwt token**********', req.app.settings.settings.jwt);

  res.render('index', {
    title: config.titleEuFunding,
    user: 'me',
    allDocument: [],
    hasToken: true,
    pathname: '/demo/eu-funding',
    fileupload: '/demo/eu-funding/fileupload',
    document: '/demo/eu-funding/document',
    verify: '/demo/eu-funding/verify',
verifyfile: '/demo/eu-funding/verifyfile'
  });
}
//-----
function checkToken(req) {
  //   console.log('check',res);
  console.log('check checkToken', req.body); // ,' ; ',req.session);

  //   req.body.value={Jwt:'jwtjwt',Did:'diddid'};
  if (req.body && req.body.Jwt) {
    console.log('1/ avant: ', req.app.settings.settings);
    //     hasToken=true;

    req.app.settings.settings.jwt = req.body.Jwt;
    req.app.settings.settings.did = req.body.Did;

    console.log('2/ apres : ', req.app.settings.settings);
  }
}
//-----

function delay(t, v) {
   return new Promise(function(resolve) { 
       setTimeout(resolve.bind(null, v), t)
   });
}

Promise.prototype.delay = function(t) {
    return this.then(function(v) {
        return delay(t, v);
    });
}


// Promise.resolve("hello").delay(500).then(function(v) {
//     console.log(v);
// });

//-----

function receivehash(req, res) {
  let conffrompathname = {};
  if (req.baseUrl === '/notary') {
    _.merge(conffrompathname, notaryConf);
  } else {
    _.merge(conffrompathname, euFundingConf);
  }

let ledgerHash= req.query.ledgerHash;
  // console.log('***********receivehash**********',req);
  console.log(req.baseUrl, '***********receivehash**********', req.query);


  getNotarizedDocument(req.query.hash, conffrompathname).delay(2000).then(function (response) {
    console.log(req.baseUrl, '***********receivehash getNotarizedDocument response**********', response);
console.log(req.baseUrl, '***********receivehash getNotarizedDocument ledgerHash**********', ledgerHash);

    let detais = {
      hash: response.hash,
      timestamp: response.timestamp,
      registeredBy: response.registeredBy,
      ledgerHash: ledgerHash
    };

    let result = {
      title: config.titleEuFunding,
      user: 'response.user',
      verified: response.verified,
      signed: response.ok,
      info: detais,
      hasToken: true
    };
    if (response.baseUrl === notaryConf.baseUrl) {
      _.merge(result, notaryConf);
    } else {
      _.merge(result, euFundingConf);
    }
    res.render('index', result);
  });
}
//-----

async function getAllDocumentFromWalletByUser(req) {
  console.log('nothing today from getAllDocumentFromWalletByUser ---', req.baseUrl);
  try {
    // var allDoc = await axios.get('http://localhost:3002/historicalTX/' + username); commented till real wallet call
    const allDoc = [];
    // console.log('getAllDocumentFromWalletByUser allDoc', allDoc.status, ' , ', allDoc.statusText);
    return allDoc;
  } catch (e) {
    console.log('****** getAllDocumentFromWalletByUser failed ******', e);
    return [];
  }
}

function getDocument(req, res) {
  const reqPath = path.join(__dirname, '../');
  const outPath = `${reqPath}/out/`;
  if (req.body.hash) {
    getDocumentByHash(req.body.hash, outPath, res);
  }
}

async function getDocumentByHash(txHash, outPath, res) {
  const token = await storageLogin();
  // var token = await login();
  // console.log('token ', token);

  let opts = {};

  if (token) {
    opts = { headers: { Authorization: `Bearer ${token}` } };
  }
  try {
    const response = await axios.get(
      `${config.api}file-storage/${txHash}`,
      opts
    );

    const contentDisposition = response.headers['content-disposition'];
    const filename = _.split(contentDisposition, 'filename=');
    const fileToSend = outPath + filename[1];

    await fs.writeFile(fileToSend, response.data, function (err) {
      if (err) throw err;
      res.download(fileToSend, function (err) {
        if (err) throw err;
        fs.unlink(fileToSend, function (err) {
          if (err) throw err;
          // if no error, file has been deleted successfully
        });
      });
    });
  } catch (e) {
    console.log(e);
  }
}

async function signIt(hash, token) {
  try {
    // get contract address and abi
    const response = await axios.get(`${config.api}notary`);

    const { notary } = response.data;

    // var rpc_node = 'https://api.ebsi.xyz/blockchain'; http://52.28.190.206:8082 old version
    const rpc_node = `${config.api}blockchain/besu`;
    // console.log('rpc_node: ', rpc_node);
    const privKey = config.private_key;
    // console.log('privKey: ', privKey);

    const web3 = new Web3(new Web3.providers.HttpProvider(rpc_node));
    const from = web3.eth.accounts.privateKeyToAccount(privKey).address;
    const contract = new web3.eth.Contract(notary.abi, notary.address);

    const data = contract.methods.addRecord(hash).encodeABI();

    const txJSON = {
      gasPrice: web3.utils.numberToHex(0),
      gasLimit: web3.utils.numberToHex(221000),
      to: notary.address,
      value: web3.utils.numberToHex(web3.utils.toWei('0', 'ether')),
      nonce: await web3.eth.getTransactionCount(from, 'pending'),
      data
    };

    const signed = await web3.eth.accounts.signTransaction(txJSON, privKey);
    const query = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [signed.rawTransaction],
      id: 1
    };
    const opts = { headers: { Authorization: `Bearer ${token}` } };
    const signResponse = await axios.post(rpc_node, query, opts);
    // console.log('-----------------------------------------------\n signResponse.data: \n', signResponse.data);
    // console.log('-----------------------------------------------\n signResponse: \n', signResponse)
    return signResponse;
  } catch (e) {
    console.log('not signed', e);
    return {};
  }
}


async function signTx(documentHash, jwtokens, fileLabel) { // only eu-funding sign today to do in notary
  console.log('=======================singTx ', documentHash);
  console.log('=======================singTx ', jwtokens);
  console.log('=======================singTx ', jwtokens.jwt);
  console.log('=======================singTx ', jwtokens.did);
  console.log('=======================singTx ', fileLabel);

  var token = jwtokens.jwt;
  //   var token =  req.app.get('settings').jwt;

  // var token ='eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJqa3UiOiJodHRwOi8vNTIuMjguMTkwLjIwNjo4MDg1L2Vic2l0cnVzdGVkYXBwL3B1YmxpYy1rZXlzLyIsImtpZCI6ImVic2ktd2FsbGV0In0.eyJzdWIiOiJnb256anVsIiwiaWF0IjoxNTc5MjQ2MDEwLCJleHAiOjE1NzkzMzI0MTAsImF1ZCI6ImVic2ktd2FsbGV0IiwiZGlkIjoiZGlkOmVic2k6MHgxRjgwODYwYzhhRkI2ZUQxMGZhZjlmOGNBNkYxNjgxMjFkQjU3RjcyIiwidXNlck5hbWUiOiJKdWxpYW5HT05aQUxFWiBBR1VERUxPIiwidXNlcklkIjoiZ29uemp1bCJ9._3cHamGrLuFt47EVat0ooeEmvlJvCkPlezIHHUSJY3k4qKVSlIwkYRK8bTL7JT43ZTPOpsaWQ4Oql2TN0hzW-A';
  // 0x6378261513f5dEf20e32b6Cf3f9bbfef190EcF8B
  // 0x4d3171BaF3eC3CE370Ec65E7D354741a970ba038
  //   var tx = {
  //     did: 'did:ebsi:0x1F80860c8aFB6eD10faf9f8cA6F168121dB57F72',
  //     hash: '0x0d27d731058ac0bce37604e83709443f14f65589a555f72814a728f28396e7e5'
  //   };

  var tx = {
    did: jwtokens.did,
    hash: documentHash,
    redirectURL: 'https://app.ebsi.xyz/demo/eu-funding/receive-hash',
    documentName: fileLabel
  };

  // req.app.get('settings')

  const opts = { headers: { Authorization: `Bearer ${token}` } };
  console.log(' tx: ', tx);
  //   try {

  var signResponse = await axios.post('https://api.ebsi.xyz/wallet/signTx', tx, opts);// <-delivery

  //     var signResponse = await axios.post('https://localhost:3004/wallet/signTx', tx, opts);//https://app.ebsi.xyz/wallet/signTx

  //     console.log('****signTx***>>>>>>>> signResponse', signResponse.status);

  return signResponse;


//   } catch (e) {
//     console.log('error: ', e);
//   }
}

/*
async function getNotif() {
  var token = 'eyJhbGciOiJFUzI1NksiLCJ0eXAiOiJKV1QiLCJqa3UiOiJodHRwOi8vNTIuMjguMTkwLjIwNjo4MDg1L2Vic2l0cnVzdGVkYXBwL3B1YmxpYy1rZXlzLyIsImtpZCI6ImVic2ktd2FsbGV0In0.eyJzdWIiOiJnb256anVsIiwiaWF0IjoxNTc5MjQ2MDEwLCJleHAiOjE1NzkzMzI0MTAsImF1ZCI6ImVic2ktd2FsbGV0IiwiZGlkIjoiZGlkOmVic2k6MHgxRjgwODYwYzhhRkI2ZUQxMGZhZjlmOGNBNkYxNjgxMjFkQjU3RjcyIiwidXNlck5hbWUiOiJKdWxpYW5HT05aQUxFWiBBR1VERUxPIiwidXNlcklkIjoiZ29uemp1bCJ9._3cHamGrLuFt47EVat0ooeEmvlJvCkPlezIHHUSJY3k4qKVSlIwkYRK8bTL7JT43ZTPOpsaWQ4Oql2TN0hzW-A';
  // 0x6378261513f5dEf20e32b6Cf3f9bbfef190EcF8B
  // 0x4d3171BaF3eC3CE370Ec65E7D354741a970ba038
  //   let tx = {
  //     did: 'did:ebsi:0x1F80860c8aFB6eD10faf9f8cA6F168121dB57F72',
  //     hash: '0x0d27d731058ac0bce37604e83709443f14f65589a555f72814a728f28396e7e5'
  //   };

  //-----------------------
  let config = {
    headers: {
      Authorization: 'Bearer ' + token
    }
  };
  // return new Promise(function (resolve, reject) {
  // axios.get(API_URL + '/notifications/', config)
  // ----------------------
  // const opts = { headers: { Authorization: `Bearer ${token}` } };
  // console.log(' tx: ', tx);


  try {
    var signResponse = await axios.get('http://localhost:3003/notifications/', config);
    console.log(signResponse);
  } catch (e) {
    console.log('error: ', e);
  }
}
*/

function verify(req, res) {
  // console.log('verify req.body ', req.body);
  let conffrompathname = {};
  if (req.baseUrl === '/notary') {
    _.merge(conffrompathname, notaryConf);
  } else {
    _.merge(conffrompathname, euFundingConf);
  }
  console.log('-- conffrompathname verify: ', conffrompathname);
  // const username = req.session[ecas.session_name];
  getNotarizedDocument(req.body.docHash, conffrompathname).then(function (response) {
    console.log('+++++verify from doc hash+++++ response', response);
    //-------
        let detais = {
      hash: response.hash,
      timestamp: response.timestamp,
      registeredBy: response.registeredBy,
      ledgerHash: 'not yet'
    };

    let result = {
      title: config.titleEuFunding,
      user: 'response.user',
      verified: response.verified,
      signed: response.ok,
      info: detais,
      hasToken: true
    };
    if (response.baseUrl === notaryConf.baseUrl) {
      _.merge(result, notaryConf);
    } else {
      _.merge(result, euFundingConf);
    }
    res.render('index', result);
    //-------
//     let result = {
//       title: config.title,
//       user: 'response.user',
//       verified: response.verified,
//       signed: response.ok,
//       info: response.document,
//       hasToken: true
//     };
//     if (response.baseUrl === notaryConf.baseUrl) {
//       _.merge(result, notaryConf);
//     } else {
//       _.merge(result, euFundingConf);
//     }
//     res.render('index', result);
    // res.render('index', {
    //   title: config.title,
    //   user: response.user,
    //   verified: response.verified,
    //   signed: response.ok,
    //   info: response.document,
    //   hasToken: true
    // });
  });
}

function verifyFile(req, res) {
  console.log('niditra verifyFile ++++++++++++++++++++++++++++++++++++++')
  let sampleFile;
  let uploadPath;
  const reqPath = path.join(__dirname, '../');
  //   const username = req.session[ecas.session_name];
  let conffrompathname = {};
  if (req.baseUrl === '/notary') {
    _.merge(conffrompathname, notaryConf);
  } else {
    _.merge(conffrompathname, euFundingConf);
  }
  console.log('-- result: ', conffrompathname);


//   console.log('=========================verifyFile=====================\n', req.app.get('settings'));
//   if (
//     _.isEmpty(req.app.get('settings').jwt)
//     || _.isEmpty(req.app.get('settings').did)
//   ) {
//     // if(req.app.get('settings').jwt ==='' && req.app.get('settings').did ===''){
//     res.redirect('https://app.ebsi.xyz/demo');
//     //   res.redirect('/demo');https://app.ebsi.xyz/demo
//     console.log('**************************** JWT and DID no*******************************************');
//     return;
//   }
//   console.log('**************************** JWT and DID yes*******************************************');



  if (!req.files || Object.keys(req.files).length === 0) {
    console.log('No files were uploaded.');

    res.redirect('/');
    return;
  }

  sampleFile = req.files.sampleFile;
  uploadPath = `${reqPath}/in/`;
  fileToStore = uploadPath + sampleFile.name;

  sampleFile.mv(fileToStore, function (err) {
    if (err) {
      console.log('file upload error ', err);
      return res.status(500).send(err);
    }

    const data = fs.readFileSync(fileToStore);
    const hash = new Web3().utils.sha3(data);

    console.log('*********************hash**********************\n', hash);
    getNotarizedDocument(hash, conffrompathname).then(function (response) {
      console.log('++++++++++ response', response);
      // console.log('file to removed: ', fileToStore);
      if (fileToStore) {
        fs.unlink(fileToStore, function (err) {
          if (err) throw err;
          // if no error, file has been deleted successfully
        });
      }

          //-------
        let detais = {
      hash: response.hash,
      timestamp: response.timestamp,
      registeredBy: response.registeredBy,
      ledgerHash: 'not yet'
    };

    let result = {
      title: config.titleEuFunding,
      user: 'response.user',
      verified: response.verified,
      signed: response.ok,
      info: detais,
      hasToken: true
    };
    if (response.baseUrl === notaryConf.baseUrl) {
      _.merge(result, notaryConf);
    } else {
      _.merge(result, euFundingConf);
    }
    res.render('index', result);
    //-------
//       let result = {
//         title: config.title,
//         user: response.user,
//         verified: response.verified,
//         signed: response.ok,
//         info: response.document,
//         hasToken: true
//       };
//       if (response.baseUrl === notaryConf.baseUrl) {
//         _.merge(result, notaryConf);
//       } else {
//         _.merge(result, euFundingConf);
//       }
//       res.render('index', result);
      // res.render('index', {
      //   title: config.title,
      //   user: response.user,
      //   verified: response.verified,
      //   signed: response.ok,
      //   info: response.document,
      //   hasToken: true
      // });
    });
  });
}

async function getNotarizedDocument(txHash, conffrompathname) {
  const token = await besuLogin();
  // var token = await login();
  console.log(' >>>>> from besu login in getNotarizedDocument token', token);

  let opts = {};

  if (token) {
    opts = { headers: { Authorization: `Bearer ${token}` } };
  }

  try {
    const response = await axios.get(`${config.api}notary/${txHash}`, opts);
    // console.log('getNotarizedDocument ',response.data)
    const result = _.assign({}, response.data, {
      user: 'username',
      verified: true
    });
    // let result = _.assign({}, response.data, { user: username, verified: true });
    console.log('1/ getNotarizedDocument ', result);

    if (response.status === 200) {
      if (result.timestamp === '0') {
        // console.log('0 - response.document.timestamp ', result.document.timestamp);
        result.ok = false;
      } else {
        const date = moment.unix(result.timestamp);
        // console.log('response.document.timestamp ', date.format());
        // result.timestamp = date.format();
        response.data.timestamp = date.format();
        // console.log(' timestamp formatted: ',response.data.timestamp);
        result.document = response.data;
        result.ok = true;
      }
    }

    console.log('2/ getNotarizedDocument ', result);

    return _.merge(result, conffrompathname);
  } catch (e) {
    console.log(
      `getNotarizedDocument: \n${config.api}notary / ${txHash} failed! \n`,
      e
    );
  }
}
/* eslint-enable consistent-return, no-use-before-define, camelcase, prefer-const */

module.exports = {
  upload,
  getAllDocument,
  getDocument,
  verify,
  verifyFile,
  noToken,
  checkToken,
  receivehash
};
