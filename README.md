# Notary - smart contract
Smart contract to timestamp a hash in the blockchain.

## How to deploy

Define `PRIVATE_KEY` in environmental variables

```
truffle compile
truffle migrate --network ebsi
```

## Current deploy

### Development environment

Version 1
  address: 0x9a3DBCa554e9f6b9257aAa24010DA8377C57c17e
  abi: [{"constant":true,"inputs":[],"name":"totalRecords","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"timestamp","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"registeredBy","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"blockNumber","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"h","type":"uint256"},{"indexed":false,"name":"a","type":"address"}],"name":"REC","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"h","type":"uint256"},{"indexed":false,"name":"a","type":"address"}],"name":"DUP","type":"event"},{"constant":false,"inputs":[{"name":"z","type":"uint256"}],"name":"addRecord","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"zz","type":"uint256[]"}],"name":"addMultipleRecords","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"}]
  
Version 2
  address: 0x3c5316F3223626f8D8Ea50Eed697F739c2778D3b
  abi: [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"docHash","type":"bytes32"},{"indexed":true,"internalType":"address","name":"signer","type":"address"},{"indexed":true,"internalType":"uint256","name":"lastBlock","type":"uint256"}],"name":"REC","type":"event"},{"constant":true,"inputs":[],"name":"lastBlockREC","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"record","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalRecords","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"bytes32","name":"docHash","type":"bytes32"}],"name":"addRecord","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]
  
### Integration environment

Version 1
  address: 0xECB550dE5c73e6690AB4521C03EC9D476617167E

Version 2
  address: 0x5A7991305FcEf2a05684DC2F3AE2ED722D69A675 
 