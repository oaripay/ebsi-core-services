const _ = require("lodash");
const path = require("path");
const axios = require("axios");
const Web3 = require("web3");
const fs = require("fs");
const FormData = require("form-data");
const moment = require("moment");
const ecas = require("../modules/ecas/ecas");
const config = require("./conf");

let fileToStore;

/* eslint-disable consistent-return, no-use-before-define */
async function login() {
  const response = await axios.post(`${config.api}login`, config.credential);
  // console.log(response.data);
  console.log("--------------------- notary login ---------------------");
  return response.data.token;
}

function upload(req, res) {
  const reqPath = path.join(__dirname, "../");
  // let csrfToken = req.csrfToken();

  if (!req.files || Object.keys(req.files).length === 0) {
    console.log("No files were uploaded.");

    res.redirect("/");
    return;
  }

  const { sampleFile } = req.files;
  const uploadPath = `${reqPath}/in/`;

  fileToStore = uploadPath + sampleFile.name;

  sampleFile.mv(fileToStore, err => {
    if (err) {
      console.log("file upload error ", err);
      return res.status(500).send(err);
    }

    Promise.all([
      storeDocWithoutPubKey(req.session.ecas_session),
      getAllDocumentFromWalletByUser(req.session.ecas_session)
    ]).then(response => {
      if (fileToStore) {
        fs.unlink(fileToStore, error => {
          if (error) throw error;
          // if no error, file has been deleted successfully
        });
      }

      // console.log(' file stored :::>>> ', response[0]);

      if (response[0] && response[0].ok) {
        // console.log(' file stored ::: ', response[0].ok, ' | ', response[0].message);
        res.render("index", {
          title: "Notary DApp",
          message: response[0].message,
          hash: response[0].hash,
          ok: response[0].ok,
          user: response[0].user,
          notary: true,
          allDocument: response[1].data,
          transactionId: response[0].transactionId
        });
      } else {
        res.render("index", {
          title: "Notary DApp",
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
  const filename = fileToStore;
  const database = "cassandra"; // 'mongo', 'cassandra',  'gluster-fs'

  if (filename) {
    try {
      const fileData = fs.readFileSync(filename);

      const form = new FormData();
      form.append("my_file", fileData, filename);
      // form.append('public_key', pubKey);
      form.append("database", database);

      const token = await login();
      const storeOpts = { headers: { post: form.getHeaders() } };

      if (token) storeOpts.headers.Authorization = `Bearer ${token}`;

      const storeResponse = await axios.post(
        "https://api.ebsi.xyz/file-storage/store",
        form,
        storeOpts
      );

      // console.log('storeDocWithoutPubKey ...\n  storeResponse.data: \n', storeResponse.data);

      const { hash } = storeResponse.data;

      // console.log('storeResponse.status: ', storeResponse.status);

      const result = _.assign({}, storeResponse.data, { user: username });
      // let result = _.assign({}, storeResponse.data, { user: username , csrfToken: csrfToken});

      /*      let hashMsgToSign = {
                            data: hash,
                            sender: username,
                            recipient: 'Notary DApp'
                        }; */
      // removed from here this sign part
      if (storeResponse.status === 200) {
        // console.log('-- hashMsgToSign: ', hashMsgToSign);
        // var signResponse = await axios.post('http://localhost:3002/signTX', username);
        const signResponse = await signIt(hash, token);
        console.log("-- signResponse: ", signResponse.data);
        // console.log('-- signResponse: ', signResponse.statusText, ' , ', signResponse.status);
        _.merge(result, {
          ok: true,
          notary: true,
          transactionId: signResponse.data.result
        });
      }

      // console.log('-- result: ', result);

      return result;
    } catch (e) {
      console.log("not stored: ", e.response.status);
      console.log(e.response.data);

      const errorResult = _.assign(
        {},
        { ok: false, message: e.response.data, user: username }
      );
      // let errorResult = _.assign({}, { ok: false, message: e.response.data, user: username ,csrfToken:csrfToken});

      return errorResult;
    }
  } else {
    // csrfToken: csrfToken,
    return {
      ok: false,
      message: "missing document",
      user: username
    };
  }
}

function getAllDocument(req, res) {
  const username = req.session[ecas.session_name];
  // console.log('1/ getAllDocument username', username);

  getAllDocumentFromWalletByUser(username).then(response => {
    if (response && response.data) {
      console.log("documents: ", response.data.length);
      res.render("index", {
        title: "Notary DApp",
        user: username,
        allDocument: response.data
      });
    } else {
      res.render("index", {
        title: "Notary DApp",
        user: username,
        allDocument: []
      });
    }
  });
}

async function getAllDocumentFromWalletByUser(/* username */) {
  // console.log('2/ getAllDocumentFromWalletByUser username', username);
  try {
    // var allDoc = await axios.get('http://localhost:3002/historicalTX/' + username); commented till real wallet call
    const allDoc = [];
    // console.log('getAllDocumentFromWalletByUser allDoc', allDoc.status, ' , ', allDoc.statusText);
    return allDoc;
  } catch (e) {
    console.log("****** getAllDocumentFromWalletByUser failed ******", e);
    return [];
  }
}

function getDocument(req, res) {
  const reqPath = path.join(__dirname, "../");
  const outPath = `${reqPath}/out/`;
  if (req.body.hash) {
    getDocumentByHash(req.body.hash, outPath, res);
  }
}

async function getDocumentByHash(txHash, outPath, res) {
  const token = await login();
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

    const contentDisposition = response.headers["content-disposition"];
    const filename = _.split(contentDisposition, "filename=");
    const fileToSend = outPath + filename[1];

    await fs.writeFile(fileToSend, response.data, err => {
      if (err) throw err;
      res.download(fileToSend, error => {
        if (error) throw error;
        fs.unlink(fileToSend, unlinkError => {
          if (unlinkError) throw unlinkError;
          // if no error, file has been deleted successfully
        });
      });
    });
  } catch (e) {
    console.log(e);
  }
}

async function signIt(hash, token) {
  // get contract address and abi
  const response = await axios.get(`${config.api}notary`);

  const { notary } = response.data;

  // var rpcNode = 'https://api.ebsi.xyz/blockchain'; http://52.28.190.206:8082 old version
  const rpcNode = `${config.api}blockchain/besu`;
  // console.log('rpcNode: ', rpcNode);
  const privKey = config.private_key;
  // console.log('privKey: ', privKey);

  const web3 = new Web3(new Web3.providers.HttpProvider(rpcNode));
  const from = web3.eth.accounts.privateKeyToAccount(privKey).address;
  const contract = new web3.eth.Contract(notary.abi, notary.address);

  const data = contract.methods.addRecord(hash).encodeABI();

  const txJSON = {
    gasPrice: web3.utils.numberToHex(0),
    gasLimit: web3.utils.numberToHex(221000),
    to: notary.address,
    value: web3.utils.numberToHex(web3.utils.toWei("0", "ether")),
    nonce: await web3.eth.getTransactionCount(from, "pending"),
    data
  };

  const signed = await web3.eth.accounts.signTransaction(txJSON, privKey);
  const query = {
    jsonrpc: "2.0",
    method: "eth_sendRawTransaction",
    params: [signed.rawTransaction],
    id: 1
  };
  const opts = { headers: { Authorization: `Bearer ${token}` } };
  const signResponse = await axios.post(rpcNode, query, opts);
  // console.log('-----------------------------------------------\n signResponse.data: \n', signResponse.data);
  // console.log('-----------------------------------------------\n signResponse: \n', signResponse)
  return signResponse;
}

function verify(req, res) {
  // console.log('verify req.body ', req.body);
  const username = req.session[ecas.session_name];
  getNotarizedDocument(req.body.docHash, username).then(response => {
    res.render("index", {
      title: "Notary DApp",
      user: response.user,
      verified: response.verified,
      signed: response.ok,
      info: response.document
    });
  });
}

function verifyFile(req, res) {
  const reqPath = path.join(__dirname, "../");
  const username = req.session[ecas.session_name];

  if (!req.files || Object.keys(req.files).length === 0) {
    console.log("No files were uploaded.");

    res.redirect("/");
    return;
  }

  const { sampleFile } = req.files;
  const uploadPath = `${reqPath}/in/`;
  fileToStore = uploadPath + sampleFile.name;

  sampleFile.mv(fileToStore, err => {
    if (err) {
      console.log("file upload error ", err);
      return res.status(500).send(err);
    }

    const data = fs.readFileSync(fileToStore);
    const hash = new Web3().utils.sha3(data);

    // console.log('*********************hash**********************\n', hash);
    getNotarizedDocument(hash, username).then(response => {
      // console.log('++++++++++ response',response)
      // console.log('file to removed: ', fileToStore);
      if (fileToStore) {
        fs.unlink(fileToStore, unlinkError => {
          if (unlinkError) throw unlinkError;
          // if no error, file has been deleted successfully
        });
      }
      res.render("index", {
        title: "Notary DApp",
        user: response.user,
        verified: response.verified,
        signed: response.ok,
        info: response.document
      });
    });
  });
}

async function getNotarizedDocument(txHash, username) {
  const token = await login();

  let opts = {};

  if (token) {
    opts = { headers: { Authorization: `Bearer ${token}` } };
  }

  try {
    const response = await axios.get(`${config.api}notary/${txHash}`, opts);
    // console.log('getNotarizedDocument ',response.data)
    const result = _.assign({}, response.data, {
      user: username,
      verified: true
    });
    // let result = _.assign({}, response.data, { user: username, verified: true });
    // console.log('1/ getNotarizedDocument ',result)

    if (response.status === 200) {
      if (result.timestamp === "0") {
        // console.log('0 - response.document.timestamp ', result.document.timestamp);
        result.ok = false;
      } else {
        const date = moment.unix(result.timestamp);
        // console.log('response.document.timestamp ', date.format());
        result.timestamp = date.format();
        result.document = response.data;
        result.ok = true;
      }
    }

    return result;
  } catch (e) {
    console.log(
      `getNotarizedDocument: \n${config.api}notary / ${txHash} failed! \n`,
      e
    );
  }
}

/* eslint-enable consistent-return, no-use-before-define */

module.exports = {
  upload,
  getAllDocument,
  getDocument,
  verify,
  verifyFile
};
