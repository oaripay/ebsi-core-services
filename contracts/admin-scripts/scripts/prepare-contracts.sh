147#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# echo $'\n'Cleaning up contracts/ folder

# rm -rf ${SCRIPT_DIR}/../contracts

echo Consolidating smart contracts

rm -rf ${SCRIPT_DIR}/../contracts
rm -rf ${SCRIPT_DIR}/../src
mkdir ${SCRIPT_DIR}/../contracts

echo Copy the bootstrap
cp -r ${SCRIPT_DIR}/../../bootstrap/contracts ${SCRIPT_DIR}/../contracts/bootstrap

echo Copy the bootstrap-v2
cp -r ${SCRIPT_DIR}/../../bootstrap-v2/contracts ${SCRIPT_DIR}/../contracts/bootstrap-v2

echo Copy the did-registry
cp -r ${SCRIPT_DIR}/../../did-registry/contracts ${SCRIPT_DIR}/../contracts/did-registry

echo Copy the did-registry-v2
cp -r ${SCRIPT_DIR}/../../did-registry-v2/contracts ${SCRIPT_DIR}/../contracts/did-registry-v2

echo Copy the did-registry-v3
cp -r ${SCRIPT_DIR}/../../did-registry-v3/contracts ${SCRIPT_DIR}/../contracts/did-registry-v3

echo Copy the did-registry-v4
cp -r ${SCRIPT_DIR}/../../did-registry-v4/contracts ${SCRIPT_DIR}/../contracts/did-registry-v4

echo Copy the proxy
cp -r ${SCRIPT_DIR}/../../proxy/contracts ${SCRIPT_DIR}/../contracts/proxy

echo Copy the timestamp
cp -r ${SCRIPT_DIR}/../../timestamp/contracts ${SCRIPT_DIR}/../contracts/timestamp

echo Copy the timestamp-v2
cp -r ${SCRIPT_DIR}/../../timestamp-v2/contracts ${SCRIPT_DIR}/../contracts/timestamp-v2

echo Copy the timestamp-v3
cp -r ${SCRIPT_DIR}/../../timestamp-v3/contracts ${SCRIPT_DIR}/../contracts/timestamp-v3

echo Copy the trusted-apps-registry
cp -r ${SCRIPT_DIR}/../../trusted-apps-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-apps-registry

echo Copy the trusted-issuers-registry
cp -r ${SCRIPT_DIR}/../../trusted-issuers-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-issuers-registry

echo Copy the trusted-issuers-registry-v3
cp -r ${SCRIPT_DIR}/../../trusted-issuers-registry-v3/contracts ${SCRIPT_DIR}/../contracts/trusted-issuers-registry-v3

echo Copy the trusted-issuers-registry-v4
cp -r ${SCRIPT_DIR}/../../trusted-issuers-registry-v4/contracts ${SCRIPT_DIR}/../contracts/trusted-issuers-registry-v4

echo Copy the trusted-policies-registry
cp -r ${SCRIPT_DIR}/../../trusted-policies-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-policies-registry

echo Copy the trusted-policies-registry-v2
cp -r ${SCRIPT_DIR}/../../trusted-policies-registry-v2/contracts ${SCRIPT_DIR}/../contracts/trusted-policies-registry-v2

echo Copy the trusted-policies-registry-v3
cp -r ${SCRIPT_DIR}/../../trusted-policies-registry-v3/contracts ${SCRIPT_DIR}/../contracts/trusted-policies-registry-v3

echo Copy the trusted-schemas-registry
cp -r ${SCRIPT_DIR}/../../trusted-schemas-registry/contracts ${SCRIPT_DIR}/../contracts/trusted-schemas-registry

echo Copy the trusted-schemas-registry-v2
cp -r ${SCRIPT_DIR}/../../trusted-schemas-registry-v2/contracts ${SCRIPT_DIR}/../contracts/trusted-schemas-registry-v2

echo Copy the trusted-schemas-registry-v3
cp -r ${SCRIPT_DIR}/../../trusted-schemas-registry-v3/contracts ${SCRIPT_DIR}/../contracts/trusted-schemas-registry-v3

echo Copy the track-and-trace
cp -r ${SCRIPT_DIR}/../../track-and-trace/contracts ${SCRIPT_DIR}/../contracts/track-and-trace

echo Copy the track-and-trace-v2
cp -r ${SCRIPT_DIR}/../../track-and-trace-v2/contracts ${SCRIPT_DIR}/../contracts/track-and-trace-v2
