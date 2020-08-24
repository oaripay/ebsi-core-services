const path = require("path");
require("dotenv").config();

const username = process.env.FABRIC_USERNAME;
const password = process.env.FABRIC_PASSWORD;

const config = {
  production: {
    fabricDomain: "fabric-prod.ebsi.tech.ec.europa.eu",
  },

  development: {
    fabricDomain: "fabric-dev.ebsi.xyz",
  },

  integration: {
    fabricDomain: "0-fabric-int-lux.intebsi.xyz",
  },

  local: {
    fabricDomain: "0-fabric-int-lux.intebsi.xyz",
  },
};

const environment = process.env.EBSI_ENV || "development";
const finalConfig = config[environment];

const sharedConf = {
  walletPath: path.resolve(__dirname, "../attributes/adminWallet"),
  peerOrgsPath: path.resolve(__dirname, "../peerOrganizations"),
  channelName: "ebsichannel",
};

const channel = { orderers: [], peers: {} };
const organizations = {};
const peers = {};
const certificateAuthorities = {};
const orderers = {};
const client = {
  tlsEnable: true,
  adminUser: username,
  adminPassword: password,
  enableAuthentication: false,
  organization: "EbsiNode1",
  connection: {
    timeout: {
      peer: { endorser: "300" },
      orderer: "300",
    },
  },
};

const { peerOrgsPath } = sharedConf;
const { fabricDomain } = finalConfig;

const NODE_ENROLLMENT = process.env.NODE_ENROLLMENT || 1;
const NODE_CONNECTION = process.env.NODE_CONNECTION || 1;

for (let i = 1; i <= 3; i += 1) {
  const ordererName = `orderer0${i}-${fabricDomain}`;
  const peerName = `peer0${i}-${fabricDomain}`;
  const organizationName = `EbsiNode${i}`;
  const certAuthority = `MspCa0${i}-${fabricDomain}`;

  if (i === NODE_ENROLLMENT) {
    organizations[organizationName] = {
      mspid: `EbsiNode${i}MSP`,
      peers: [peerName],
      certificateAuthorities: [certAuthority],
      adminPrivateKey: {
        path: `${peerOrgsPath}/ebsinode${i}/users/Admin0${i}@ebsi.xyz/msp/keystore/client_sk`,
      },
      signedCert: {
        path: `${peerOrgsPath}/ebsinode${i}/users/Admin0${i}@ebsi.xyz/msp/admincerts/cert.pem`,
      },
    };

    certificateAuthorities[certAuthority] = {
      url: `http://${certAuthority.toLowerCase()}:7055`,
      caName: certAuthority.toLowerCase(),
      registrar: {
        enrollId: "",
        enrollSecret: "",
      },
    };
  }

  if (i === NODE_CONNECTION) {
    const pathPeerCertificate = `${peerOrgsPath}/ebsinode${i}/tls/tlsintermediatecerts/tlsCa.pem`;

    peers[peerName] = {
      tlsCACerts: { path: pathPeerCertificate },
      url: `grpcs://${peerName}:7051`,
      eventUrl: `grpcs://${peerName}:7053`,
    };

    orderers[ordererName] = {
      tlsCACerts: { path: pathPeerCertificate },
      url: `grpcs://${ordererName}:7050`,
    };

    channel.orderers.push(ordererName);
    channel.peers[peerName] = {
      ledgerQuery: true,
    };
  }
}

const channels = {
  ebsichannel: JSON.parse(JSON.stringify(channel)),
};

const connectionProfile = {
  name: "EBSI",
  version: "1.0.0",
  license: "Apache-2.0",
  client,
  channels,
  organizations,
  peers,
  certificateAuthorities,
  orderers,
};

module.exports = connectionProfile;
