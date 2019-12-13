var _ = require('lodash');
var path = require('path');
var ecas = require('../modules/ecas/ecas');
var axios = require('axios');
var Web3 = require('web3');
var fs = require('fs');
var FormData = require('form-data');
var moment = require('moment');
var config = require('./conf');

var fileToStore;



/* eslint-disable consistent-return, no-use-before-define, camelcase */
async function login() {


    let response = await axios.post(config.api + 'login', config.credential);
    // console.log(response.data);
    console.log('--------------------- notary login ---------------------');
    return response.data.token;
}


function upload(req, res) {
    let sampleFile;
    let uploadPath;
    let reqPath = path.join(__dirname, '../');
    // let csrfToken = req.csrfToken();

    if (!req.files || Object.keys(req.files).length === 0) {
        console.log('No files were uploaded.');

        res.redirect('/');
        return;
    }

    sampleFile = req.files.sampleFile;

    uploadPath = reqPath + '/in/';

    fileToStore = uploadPath + sampleFile.name;

    sampleFile.mv(fileToStore, function(err) {
        if (err) {
            console.log('file upload error ', err);
            return res.status(500).send(err);
        }


        Promise.all([
            storeDocWithoutPubKey(req.session.ecas_session),
            getAllDocumentFromWalletByUser(req.session.ecas_session)
        ]).then(function(response) {
            if (fileToStore) {
                fs.unlink(fileToStore, function(err) {
                    if (err) throw err;
                    // if no error, file has been deleted successfully
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

            // console.log('storeResponse.status: ', storeResponse.status);

            let result = _.assign({}, storeResponse.data, { user: username });
            // let result = _.assign({}, storeResponse.data, { user: username , csrfToken: csrfToken});

            /*      let hashMsgToSign = {
                            data: hash,
                            sender: username,
                            recipient: 'Notary DApp'
                        }; */
            // removed from here this sign part
            if (storeResponse.status===200) {
                // console.log('-- hashMsgToSign: ', hashMsgToSign);
                // var signResponse = await axios.post('http://localhost:3002/signTX', username);
                var signResponse = await signIt(hash, token);
                console.log('-- signResponse: ', signResponse.data);
                // console.log('-- signResponse: ', signResponse.statusText, ' , ', signResponse.status);
                _.merge(result, { ok:true ,notary: true, transactionId: signResponse.data.result });
            }

            // console.log('-- result: ', result);

            return result;
        } catch (e) {
            console.log('not stored: ', e.response.status);
            console.log(e.response.data);

            let errorResult = _.assign({}, { ok: false, message: e.response.data, user: username });
            // let errorResult = _.assign({}, { ok: false, message: e.response.data, user: username ,csrfToken:csrfToken});

            return errorResult;
        }
    } else {
        // csrfToken: csrfToken,
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

    getAllDocumentFromWalletByUser(username).then(function(response) {
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
        // var allDoc = await axios.get('http://localhost:3002/historicalTX/' + username); commented till real wallet call
        var allDoc = [];
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
    if (req.body.hash) {
        getDocumentByHash(req.body.hash, outPath, res);
    }
}


async function getDocumentByHash(txHash, outPath, res) {
    var token = await login();
    // console.log('token ', token);

    var opts = {};

    if (token) {
        opts = { headers: { Authorization: `Bearer ${token}` } };
    }
    try {
        var response = await axios.get(config.api + 'file-storage/' + txHash, opts);

        let contentDisposition = response.headers['content-disposition'];
        let filename = _.split(contentDisposition, 'filename=');
        let fileToSend = outPath + filename[1];

        await fs.writeFile(fileToSend, response.data, function(err) {
            if (err) throw err;
            res.download(fileToSend, function(err) {
                if (err) throw err;
                fs.unlink(fileToSend, function(err) {
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
    // get contract address and abi
    var response = await axios.get(config.api + 'notary');

    var notary = response.data.notary;

    // var rpc_node = 'https://api.ebsi.xyz/blockchain'; http://52.28.190.206:8082 old version
    var rpc_node = config.api + 'blockchain/besu';
    // console.log('rpc_node: ', rpc_node);
    var privKey = config.private_key;
    // console.log('privKey: ', privKey);

    var web3 = new Web3(new Web3.providers.HttpProvider(rpc_node));
    var from = web3.eth.accounts.privateKeyToAccount(privKey).address;
    var contract = new web3.eth.Contract(notary.abi, notary.address);

    var data = contract.methods.addRecord(hash).encodeABI();

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
    getNotarizedDocument(req.body.docHash, username).then(function(response) {
        res.render('index', {
            title: 'Notary DApp',
            user: response.user,
            verified: response.verified,
            signed: response.ok,
            info: response.document
        });
    });
}


function verifyFile(req, res) {
    let sampleFile;
    let uploadPath;
    let reqPath = path.join(__dirname, '../');
    let username = req.session[ecas.session_name];

    if (!req.files || Object.keys(req.files).length === 0) {
        console.log('No files were uploaded.');

        res.redirect('/');
        return;
    }

    sampleFile = req.files.sampleFile;
    uploadPath = reqPath + '/in/';
    fileToStore = uploadPath + sampleFile.name;

    sampleFile.mv(fileToStore, function(err) {
        if (err) {
            console.log('file upload error ', err);
            return res.status(500).send(err);
        }

        var data = fs.readFileSync(fileToStore);
        var hash = new Web3().utils.sha3(data);

        // console.log('*********************hash**********************\n', hash);
        getNotarizedDocument(hash, username).then(function(response) {
          // console.log('++++++++++ response',response)
            // console.log('file to removed: ', fileToStore);
            if (fileToStore) {
                fs.unlink(fileToStore, function(err) {
                    if (err) throw err;
                    // if no error, file has been deleted successfully
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
        // console.log('getNotarizedDocument ',response.data)
        let result = _.assign({}, response.data, { user: username, verified: true });
        // let result = _.assign({}, response.data, { user: username, verified: true });
        // console.log('1/ getNotarizedDocument ',result)

        if (response.status===200) {
            if (result.timestamp === '0') {
                // console.log('0 - response.document.timestamp ', result.document.timestamp);
                result.ok = false;
            } else {
                let date = moment.unix(result.timestamp);
                // console.log('response.document.timestamp ', date.format());
                result.timestamp = date.format();
                result.document = response.data;
                result.ok = true;

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