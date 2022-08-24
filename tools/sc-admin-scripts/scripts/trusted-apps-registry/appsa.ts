const apps = [
  {
    name: "user-wallet-web-client",
    privateKeyHex:
      "050a4c58b09f3253522de4be5cc48a28116526a37acf1dae2d29e002241e03a5",
    domain: 0,
    status: 1,
  },
  {
    name: "enterprise-wallet-back-end",
    privateKeyHex:
      "af7d9a1b9050bff6f716b4ef97eb14685dfd2c2a7f3de011de266fc38172b48f",
    domain: 0,
    status: 1,
  },
  {
    name: "iossvat-web-client",
    privateKeyHex:
      "da0f5aadb5afd88607f844a63d27fa5bd4a8c952d37d801f815d4da1e91a855f",
    domain: 0,
    status: 1,
  },
  {
    name: "iossvat-back-end",
    privateKeyHex:
      "55e970e73fa3d71708b27c4e89df8c322fc9fb8153da617531788756d62749fa",
    domain: 0,
    status: 1,
  },
  {
    name: "notaris-web-client",
    privateKeyHex:
      "1c1f0183215c1f70213a0d4d2431aae0481a05c3be2437733a86217ef8e4f9ba",
    domain: 0,
    status: 1,
  },
  {
    name: "notaris-back-end",
    privateKeyHex:
      "7b229787613c79fe7f7f2954a6d7a2064df3d3bab6b71d7f68da315a2c286f9d",
    domain: 0,
    status: 1,
  },
  {
    name: "trusted-issuers-registry-api",
    privateKeyHex:
      "81b056608a345bd4d6d794f68c94800e7a8dfaf6d8293911298cf004e70afa1e",
    domain: 0,
    status: 1,
  },
  {
    name: "trusted-schemas-registry-api",
    privateKeyHex:
      "07b2b76f2cf10a7f614b93db3e8bd8f9279eb09ea20c9ca72c5ebdc93b2ff9e7",
    domain: 0,
    status: 1,
  },
  {
    name: "trusted-apps-registry-api",
    privateKeyHex:
      "01278164cc8ef4a9b3fe002b983612c00483cfab1d8a6ec052f0b9c6262f449f",
    domain: 0,
    status: 1,
  },
  {
    name: "trusted-iam-registry-api",
    privateKeyHex:
      "6d5b32512cfc6a8dd9e711c097552fa67fd6c297440436009307f8ffa55be834",
    domain: 0,
    status: 1,
  },
  {
    name: "trusted-sc-registry-api",
    privateKeyHex:
      "ec1ada36bcc5a69c653b60c24e338f02440b754f5ac0f2e9b128c7e2ad1f27c0",
    domain: 0,
    status: 1,
  },
  {
    name: "verifiable-credential-api",
    privateKeyHex:
      "802ef59c8f26c9a12e354b595fe60169b0450db66345d7057a2b26ea0e49f61f",
    domain: 0,
    status: 1,
  },
  {
    name: "verifiable-presentation-api",
    privateKeyHex:
      "94b5a5715d005257c8e7fa01f7bfc2689db8144f8051126c3d8d6d77da62b2cd",
    domain: 0,
    status: 1,
  },
  {
    name: "identity-hub-api",
    privateKeyHex:
      "03e1963cee885420450c1e530694994293d298c8e08c2c94815137dd1b4acbf9",
    domain: 0,
    status: 1,
  },
  {
    name: "did-registry-api",
    privateKeyHex:
      "6260b8f1bf1ffb0101e5281d1b79b7501442b225863454048263911d1c95393d",
    domain: 0,
    status: 1,
  },
  {
    name: "eidas-bridge-api",
    privateKeyHex:
      "9cb90043f20352644141d98461d6b526c48e94376639732021f723a1af9ca87b",
    domain: 0,
    status: 1,
  },
  {
    name: "authorisation-api",
    privateKeyHex:
      "2abd2032b88720f8675e3458819c4d315f1be3a33de77083fa2ea54f84d85724",
    domain: 0,
    status: 1,
  },
  {
    name: "reverse-proxy",
    privateKeyHex:
      "88e966cb519d8aefd2c07d6529fab9b083ab3800205037249fd7ee3f52939921",
    domain: 0,
    status: 1,
  },
  {
    name: "wallet-api",
    privateKeyHex:
      "26ceb09590b58b45ce2836a49cd78ae00e8bc8cf742f4042d677af0cb6610255",
    domain: 0,
    status: 1,
  },
  {
    name: "timestamp-api",
    privateKeyHex:
      "0ea88788e68e816800f0e80f51d51aa81ea4109df69fd87b0fffd12f2e45a81e",
    domain: 0,
    status: 1,
  },
  {
    name: "storage-api",
    privateKeyHex:
      "f2088c73a12c2cc0fa9174200a857a295d86e0a49e57819fd8d82b2bff00803e",
    domain: 0,
    status: 1,
  },
  {
    name: "ledger-api",
    privateKeyHex:
      "25ff8ceb85e07fa928aaac3691b02bcd211895b92738b1a85849827d1f9b46e5",
    domain: 0,
    status: 1,
  },
  {
    name: "notifications-api",
    privateKeyHex:
      "e84940f943faff4c67c04e70b5c7478d34339f7a9202e0ba0cdaeaa4c49bcc14",
    domain: 0,
    status: 1,
  },
  {
    name: "fabric-root-ca",
    privateKeyHex:
      "24af8c8406b2b7b40e24ce4e90f131c5c0937e0571824637bb736b167cd21364",
    domain: 0,
    status: 1,
  },
  {
    name: "fabric-ica",
    privateKeyHex:
      "3856688ce201050aedfa19c486d8b343ac78c1ec194806f92d355968d6705b51",
    domain: 0,
    status: 1,
  },
  {
    name: "fabric-peer",
    privateKeyHex:
      "f5a05ea4cbd71a9f8fe92e10610da3395572985f69ef172e96ae2d84dc750383",
    domain: 0,
    status: 1,
  },
  {
    name: "fabric-peer-db",
    privateKeyHex:
      "c37d9cd7bb655a9e8625d9d470c2a49823362302decdcfb564878c67b2a24349",
    domain: 0,
    status: 1,
  },
  {
    name: "fabric-orderer",
    privateKeyHex:
      "9bd9409c412cb11dbacc5b73c9a0606a23dfa230c74e1c43d3c76a05be9e9bef",
    domain: 0,
    status: 1,
  },
  {
    name: "fabric-cli",
    privateKeyHex:
      "b1982874c02cf235431753a110906408692b383591d3940e40f1c1e29465ccd4",
    domain: 0,
    status: 1,
  },
];

/* TODO - Private keys with issues
   dd3dd80284bfaf73aa3d6979785d7cb71bcb588bd9f65516caab1ae01f0485b6
*/

export default apps;
