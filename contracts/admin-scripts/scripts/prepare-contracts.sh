#!/bin/bash

echo $'\n'Cleaning up contracts/ folder

rm -rf contracts
mkdir contracts

echo Consolidating smart contracts

echo Copy the bootstrap
cp -r ../bootstrap/contracts contracts/bootstrap

echo Copy the did-registry
cp -r ../did-registry/contracts contracts/did-registry

echo Copy the proxy
cp -r ../proxy/contracts contracts/proxy

echo Copy the timestamp
cp -r ../timestamp/contracts contracts/timestamp

echo Copy the trusted-apps-registry
cp -r ../trusted-apps-registry/contracts contracts/trusted-apps-registry

echo Copy the trusted-issuers-registry
cp -r ../trusted-issuers-registry/contracts contracts/trusted-issuers-registry

echo Copy the trusted-ledgers-registry
cp -r ../trusted-ledgers-registry/contracts contracts/trusted-ledgers-registry

echo Copy the trusted-policies-registry
cp -r ../trusted-policies-registry/contracts contracts/trusted-policies-registry

echo Copy the trusted-schemas-registry
cp -r ../trusted-schemas-registry/contracts contracts/trusted-schemas-registry
