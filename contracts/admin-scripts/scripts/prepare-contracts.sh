#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# echo $'\n'Cleaning up contracts/ folder

# rm -rf ${SCRIPT_DIR}/../contracts

echo Consolidating smart contracts

rm -rf ${SCRIPT_DIR}/../contracts
rm -rf ${SCRIPT_DIR}/../src
mkdir ${SCRIPT_DIR}/../contracts

echo Copy the bootstrap smart contract
cp -r ${SCRIPT_DIR}/../../bootstrap/contracts ${SCRIPT_DIR}/../contracts/bootstrap

echo Copy the bootstrap-v2 smart contract
cp -r ${SCRIPT_DIR}/../../bootstrap-v2/contracts ${SCRIPT_DIR}/../contracts/bootstrap-v2

echo Copy the did-registry smart contract
cp -r ${SCRIPT_DIR}/../../did-registry/contracts ${SCRIPT_DIR}/../contracts/did-registry

echo Copy the did-registry-v2 smart contract
cp -r ${SCRIPT_DIR}/../../did-registry-v2/contracts ${SCRIPT_DIR}/../contracts/did-registry-v2

echo Copy the did-registry-v5 smart contract
cp -r ${SCRIPT_DIR}/../../did-registry-v5/contracts ${SCRIPT_DIR}/../contracts/did-registry-v5

echo Copy the proxy smart contract
cp -r ${SCRIPT_DIR}/../../proxy/contracts ${SCRIPT_DIR}/../contracts/proxy

echo Copy the timestamp smart contract
cp -r ${SCRIPT_DIR}/../../timestamp/contracts ${SCRIPT_DIR}/../contracts/timestamp

echo Copy the timestamp-v4 smart contract
cp -r ${SCRIPT_DIR}/../../timestamp-v4/contracts ${SCRIPT_DIR}/../contracts/timestamp-v4

echo Copy the trusted-issuers-registry smart contract
cp -r ${SCRIPT_DIR}/../../trusted-issuers-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-issuers-registry

echo Copy the trusted-issuers-registry-v5 smart contract
cp -r ${SCRIPT_DIR}/../../trusted-issuers-registry-v5/contracts ${SCRIPT_DIR}/../contracts/trusted-issuers-registry-v5

echo Copy the trusted-policies-registry smart contract
cp -r ${SCRIPT_DIR}/../../trusted-policies-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-policies-registry

echo Copy the trusted-policies-registry-v2 smart contract
cp -r ${SCRIPT_DIR}/../../trusted-policies-registry-v2/contracts ${SCRIPT_DIR}/../contracts/trusted-policies-registry-v2

echo Copy the trusted-schemas-registry smart contract
cp -r ${SCRIPT_DIR}/../../trusted-schemas-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-schemas-registry

echo Copy the trusted-schemas-registry-v2 smart contract
cp -r ${SCRIPT_DIR}/../../trusted-schemas-registry-v2/contracts ${SCRIPT_DIR}/../contracts/trusted-schemas-registry-v2

echo Copy the track-and-trace smart contract
cp -r ${SCRIPT_DIR}/../../track-and-trace/contracts ${SCRIPT_DIR}/../contracts/track-and-trace
