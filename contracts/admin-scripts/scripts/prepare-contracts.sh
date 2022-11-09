#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# echo $'\n'Cleaning up contracts/ folder

# rm -rf ${SCRIPT_DIR}/../contracts
# mkdir ${SCRIPT_DIR}/../contracts

echo Consolidating smart contracts

echo Copy the bootstrap
cp -r ${SCRIPT_DIR}/../../bootstrap/contracts ${SCRIPT_DIR}/../contracts/bootstrap

echo Copy the did-registry
cp -r ${SCRIPT_DIR}/../../did-registry/contracts ${SCRIPT_DIR}/../contracts/did-registry

echo Copy the proxy
cp -r ${SCRIPT_DIR}/../../proxy/contracts ${SCRIPT_DIR}/../contracts/proxy

echo Copy the timestamp
cp -r ${SCRIPT_DIR}/../../timestamp/contracts ${SCRIPT_DIR}/../contracts/timestamp

echo Copy the trusted-apps-registry
cp -r ${SCRIPT_DIR}/../../trusted-apps-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-apps-registry

echo Copy the trusted-issuers-registry
cp -r ${SCRIPT_DIR}/../../trusted-issuers-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-issuers-registry

echo Copy the trusted-ledgers-registry
cp -r ${SCRIPT_DIR}/../../trusted-ledgers-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-ledgers-registry

echo Copy the trusted-policies-registry
cp -r ${SCRIPT_DIR}/../../trusted-policies-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-policies-registry

echo Copy the trusted-schemas-registry
cp -r ${SCRIPT_DIR}/../../trusted-schemas-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-schemas-registry
