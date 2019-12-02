var _ = require('lodash');
var path = require('path');
var ecas = require('../modules/ecas/ecas');
var axios = require('axios');
var Web3 = require('web3');
var fs = require('fs');
var FormData = require('form-data');
var moment = require('moment');

var fileToStore;


var config = {
  api: 'https://api.ebsi.xyz/',
  private_key: '0x81e4b01ba124f35f521fc83ff6c11bdbf8d31b21a1765f165af09dd965fc832f'
};

/* eslint-disable consistent-return, no-use-before-define, camelcase */
async function login() {
  var credential = {
    username: 'notary',
    password: 'notary'
  };

  // console.log('\n=== login server response ===');
  let response = await axios.post(config.api + 'login', credential);
  // console.log(response.data);
  console.log('--------------------- notary login ---------------------');
  return response.data.token;
}


function upload(req, res) {
  let sampleFile;
  let uploadPath;
  let reqPath = path.join(__dirname, '../');

  if (!req.files || Object.keys(req.files).length === 0) {
    console.log('No files were uploaded.');

    res.redirect('/');
    return;
  }

  sampleFile = req.files.sampleFile;

  uploadPath = reqPath + '/in/';

  // console.log('uploadPath ', uploadPath);

  fileToStore = uploadPath + sampleFile.name;

  sampleFile.mv(fileToStore, function (err) {
    if (err) {
      console.log('file upload error ', err);
      return res.status(500).send(err);
    }


    Promise.all([
      storeDocWithoutPubKey(req.session.ecas_session),
      getAllDocumentFromWalletByUser(req.session.ecas_session)
    ]).then(function (response) {
      // console.log('file to removed: ', fileToStore);
      if (fileToStore) {
        fs.unlink(fileToStore, function (err) {
          if (err) throw err;
          // if no error, file has been deleted successfully
          // console.log(fileToStore, ' File deleted!');
        });
      }

      // console.log(' file stored :::>>> ', response[0]);

      if (response[0] && response[0].ok) {
        // console.log(' file stored ::: ', response[0].ok, ' | ', response[0].message);
        res.render('index', {
          title: 'Notary DApp',
          message: response[0].message,
          hash: response[0].hash,
          ok: response[0].ok,
          user: response[0].user,
          notary: true,
          allDocument: response[1].data,
          transactionId: response[0].transactionId
        });
      } else {
        res.render('index', {
          title: 'Notary DApp',
          message: response[0].message,
          ok: response[0].ok,
          user: response[0].user,
          allDocument: response[1].data
        });
      }
    });
  });
}


async function storeDocWithoutPubKey(username) {
  var filename = fileToStore;
  var database = 'cassandra'; // 'mongo', 'cassandra',  'gluster-fs'

  if (filename) {
    // console.log('------- filename ------', filename);

    try {
      const fileData = fs.readFileSync(filename);

      var form = new FormData();
      form.append('my_file', fileData, filename);
      // form.append('public_key', pubKey);
      form.append('database', database);

      var token = await login();
      var storeOpts = { headers: { post: form.getHeaders() } };

      if (token) storeOpts.headers.Authorization = `Bearer ${token}`;

      var storeResponse = await axios.post('https://api.ebsi.xyz/file-storage/store', form, storeOpts);

      // console.log('storeDocWithoutPubKey ...\n  storeResponse.data: \n', storeResponse.data);

      let hash = storeResponse.data.hash;

      // console.log('hash: ', hash);

      let result = _.assign({}, storeResponse.data, { user: username });

      /*      let hashMsgToSign = {
                      data: hash,
                      sender: username,
                      recipient: 'Notary DApp'
                  }; */

      if (result.ok) {
        // console.log('-- hashMsgToSign: ', hashMsgToSign);
        // var signResponse = await axios.post('http://localhost:3002/signTX', username);

        var signResponse = await signIt(hash, token);
        // console.log('-- signResponse: ', signResponse.data);
        // console.log('-- signResponse: ', signResponse.statusText, ' , ', signResponse.status);
        _.merge(result, { notary: true, transactionId: signResponse.data.result });
      }

      // console.log('-- result: ', result);

      return result;
    } catch (e) {
      console.log('****** store failed with error******', e);
    }
  } else {
    return {
      ok: false,
      message: 'missing document',
      user: username
    };
  }
}


function getAllDocument(req, res) {
  let username = req.session[ecas.session_name];
  // console.log('1/ getAllDocument username', username);

  getAllDocumentFromWalletByUser(username).then(function (response) {
    if (response && response.data) {
      console.log('documents: ', response.data.length);
      res.render('index', { title: 'Notary DApp', user: username, allDocument: response.data });
    } else {
      res.render('index', { title: 'Notary DApp', user: username, allDocument: [] });
    }
  });
}

async function getAllDocumentFromWalletByUser(username) {
  // console.log('2/ getAllDocumentFromWalletByUser username', username);
  try {
    var allDoc = await axios.get('http://localhost:3002/historicalTX/' + username);
    // console.log('getAllDocumentFromWalletByUser allDoc', allDoc.status, ' , ', allDoc.statusText);
    return allDoc;
  } catch (e) {
    console.log('****** getAllDocumentFromWalletByUser failed ******', e);
    return [];
  }
}


function getDocument(req, res) {
  let reqPath = path.join(__dirname, '../');
  let outPath = reqPath + '/out/';
  // console.log('getDocument', req.body);
  // console.log('outPath***************1***********************outPath', outPath);

  if (req.body.hash) {
    getDocumentByHash(req.body.hash, outPath, res);
  }
}


async function getDocumentByHash(txHash, outPath, res) {
  // console.log('getDocumentByHash: ----\nhash: ', txHash);
  // console.log('outPath******************2********************outPath', outPath);

  var token = await login();
  // console.log('token ', token);

  var opts = {};

  if (token) {
    opts = { headers: { Authorization: `Bearer ${token}` } };
  }
  try {
    var response = await axios.get(config.api + 'file-storage/' + txHash, opts);

    let contentDisposition = response.headers['content-disposition'];
    // console.log('\n=== Document ===')
    // console.log(contentDisposition);
    // console.log(response.data);

    let filename = _.split(contentDisposition, 'filename=');
    // console.log('filename ', filename[1]);

    let fileToSend = outPath + filename[1];
    // console.log('fileToSend', fileToSend);

    await fs.writeFile(fileToSend, response.data, function (err) {
      if (err) throw err;
      // console.log(fileToSend, ' File saved!');
      res.download(fileToSend, function (err) {
        if (err) throw err;
        fs.unlink(fileToSend, function (err) {
          if (err) throw err;
          // if no error, file has been deleted successfully
          // console.log(fileToSend, ' File deleted!');
        });
        // console.log(fileToSend, ' File downloaded');
      });
    });
  } catch (e) {
    console.log(e);
  }
}


async function signIt(hash, token) {
  // console.log('0)----------------------signIt--------------------\n hash: ', hash);

  // get contract address and abi
  var response = await axios.get(config.api + 'notary');
  // console.log('1)------------------------------------------\n response: ', response.status);

  var notary = response.data.notary;
  // console.log('2)------------------------------------------\n notary: {abi: ',notary.abi,'\t address',notary.address);

  // var rpc_node = 'https://api.ebsi.xyz/blockchain';
  var rpc_node = config.api + 'blockchain';
  console.log('rpc_node: ', rpc_node);
  var privKey = config.private_key;
  // console.log('privKey: ', privKey);

  var web3 = new Web3(new Web3.providers.HttpProvider(rpc_node));
  var from = web3.eth.accounts.privateKeyToAccount(privKey).address;
  var contract = new web3.eth.Contract(notary.abi, notary.address);

  // console.log('3)------------------------------------------\n contract: ',contract);
  // console.log('hash: ', hash);

  var data = contract.methods.addRecord(hash).encodeABI();
  // console.log('4)------------------------------------------\n data: ', data);

  var txJSON = {
    gasPrice: web3.utils.numberToHex(0),
    gasLimit: web3.utils.numberToHex(221000),
    to: notary.address,
    value: web3.utils.numberToHex(web3.utils.toWei('0', 'ether')),
    nonce: await web3.eth.getTransactionCount(from, 'pending'),
    data: data
  };

  var signed = await web3.eth.accounts.signTransaction(txJSON, privKey);
  var query = {
    jsonrpc: '2.0',
    method: 'eth_sendRawTransaction',
    params: [signed.rawTransaction],
    id: 1
  };
  var opts = { headers: { Authorization: `Bearer ${token}` } };
  var signResponse = await axios.post(rpc_node, query, opts);
  // console.log('-----------------------------------------------\n signResponse.data: \n', signResponse.data);
  // console.log('-----------------------------------------------\n signResponse: \n', signResponse)
  return signResponse;
}

function verify(req, res) {
  // console.log('verify req.body ', req.body);
  let username = req.session[ecas.session_name];
  getNotarizedDocument(req.body.docHash, username).then(function (response) {
    res.render('index', {
      title: 'Notary DApp',
      user: response.user,
      verified: response.verified,
      signed: response.ok,
      info: response.document
    });
  });
}


/*
function verifyFile(req, res) {
    console.log('verify req.body ', req.body);
    let username = req.session[ecas.session_name];
    var data = fs.readFileSync(filename)
    var hash = new Web3().utils.sha3(data)
    getNotarizedDocument(req.body.docHash, username).then(function(response) {
        // if (response && response.ok) {
        res.render('index', { title: 'Notary DApp', user: response.user, verified: response.verified, signed: response.ok, info: response.document });

        // } else {
        //     res.render('index', { title: 'Notary DApp', user: username, verified: response.data });

        // }
    });
} */
function verifyFile(req, res) {
  let sampleFile;
  let uploadPath;
  let reqPath = path.join(__dirname, '../');
  let username = req.session[ecas.session_name];

  // console.log('\n------------------------------\nfileupload: ', req.files);
  // console.log('\n------------------------------\nbody: ', req.body);
  // console.log('\n------------------------------\nuploadPath: ', uploadPath);

  if (!req.files || Object.keys(req.files).length === 0) {
    console.log('No files were uploaded.');

    res.redirect('/');
    return;
  }

  sampleFile = req.files.sampleFile;

  uploadPath = reqPath + '/in/';

  // console.log('uploadPath ', uploadPath);

  fileToStore = uploadPath + sampleFile.name;

  // var data = fs.readFileSync(fileToStore);
  // var hash = new Web3().utils.sha3(data);

  // console.log('*********************hash**********************\n',hash);

  sampleFile.mv(fileToStore, function (err) {
    if (err) {
      console.log('file upload error ', err);
      return res.status(500).send(err);
    }

    var data = fs.readFileSync(fileToStore);
    var hash = new Web3().utils.sha3(data);

    // console.log('*********************hash**********************\n', hash);
    getNotarizedDocument(hash, username).then(function (response) {
      // console.log('file to removed: ', fileToStore);
      if (fileToStore) {
        fs.unlink(fileToStore, function (err) {
          if (err) throw err;
          // if no error, file has been deleted successfully
          // console.log(fileToStore, ' File deleted!');
        });
      }
      res.render('index', {
        title: 'Notary DApp',
        user: response.user,
        verified: response.verified,
        signed: response.ok,
        info: response.document
      });
    });
  });
}

async function getNotarizedDocument(txHash, username) {
  var token = await login();

  var opts = {};

  if (token) {
    opts = { headers: { Authorization: `Bearer ${token}` } };
  }

  try {
    var response = await axios.get(config.api + 'notary/' + txHash, opts);
    // console.log('\n=== Document ===');
    // console.log(response.data);
    let result = _.assign({}, response.data, { user: username, verified: true });

    // console.log('result ', result);
    if (result.document) {
      if (result.document.timestamp === '0') {
        // console.log('0 - response.document.timestamp ', result.document.timestamp);
        result.ok = false;
      } else {
        let date = moment.unix(result.document.timestamp);
        // console.log('response.document.timestamp ', date.format());
        result.document.timestamp = date.format();
      }
    }


    return result;
  } catch (e) {
    console.log('getNotarizedDocument: \n' + config.api + 'notary / ' + txHash + ' failed! \n', e);
  }
}
/* eslint-enable consistent-return, no-use-before-define, camelcase */

module.exports = {
  upload: upload,
  getAllDocument: getAllDocument,
  getDocument: getDocument,
  verify: verify,
  verifyFile: verifyFile
};
