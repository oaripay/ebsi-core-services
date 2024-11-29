#!/bin/bash

dependencies="$(pwd)/scripts/deployment/dependencies.json"
dependenciesUpdated="$(pwd)/scripts/deployment/updated_dependencies.json"


account=`npx hardhat accounts --network box | sed -n '2p'`
chainId=`curl -X POST --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":51}' http://192.168.55.5:8545 | jq ".result" | xargs printf "%d\n"`
# deploy proxy for TPR
output=`yarn hardhat deploy --network box --tags OwnedUpgradeabilityProxy --reset`
tprProxy=`echo $output | grep -o '\b0x[a-fA-F0-9]\{40\}\b'`
yarn hardhat initProxy --network box --proxy $tprProxy --implementation PolicyRegistryV3

# update dependencies
jq --arg chainId "$chainId" --arg tprProxy "$tprProxy" '.[$chainId] += {
  "tprV1Address": $tprProxy,
  "tprV2Address": $tprProxy,
  "tprV3Address": $tprProxy
}' $dependencies > $dependenciesUpdated

mv $dependenciesUpdated $dependencies


# deploy proxy for DIDRegistry
output=`yarn hardhat deploy --network box --tags OwnedUpgradeabilityProxy --reset`
DIDRegistryProxy=`echo $output | grep -o '\b0x[a-fA-F0-9]\{40\}\b'`
yarn hardhat initProxy --network box --proxy $DIDRegistryProxy --implementation DidRegistryV4

# update dependencies with did registry service
jq --arg chainId "$chainId" --arg DIDRegistryProxy "$DIDRegistryProxy" '.[$chainId] += {
  "didV1Address": $DIDRegistryProxy,
  "didV2Address": $DIDRegistryProxy,
  "didV3Address": $DIDRegistryProxy,
  "didV4Address": $DIDRegistryProxy
}' $dependencies > $dependenciesUpdated

mv $dependenciesUpdated $dependencies
# deploy timestamp
output=`yarn hardhat --network box timestampV3 --upgrader $account --tpr $tprProxy`
TimestampProxy=`echo $output | grep -o '\b0x[a-fA-F0-9]\{40\}\b' | tail -1`
# track and trace
output=`yarn hardhat --network box trackAndTraceV2 --admin  $account --upgrader $account --registry $DIDRegistryProxy --tpr $tprProxy`
TrackAndTraceProxy=`echo $output | grep -o '\b0x[a-fA-F0-9]\{40\}\b' | tail -1`

# TrustedIssuersRegistry
output=`yarn hardhat deploy --network box --tags OwnedUpgradeabilityProxy --reset`
tirRegistry=`echo $output | grep -o '\b0x[a-fA-F0-9]\{40\}\b'`
yarn hardhat initProxy --network box --proxy $tirRegistry --implementation TirV3

# TrustedSchemasRegistry
output=`yarn hardhat deploy --network box --tags OwnedUpgradeabilityProxy --reset`
tsrRegistry=`echo $output | grep -o '\b0x[a-fA-F0-9]\{40\}\b'`
yarn hardhat initProxy --network box --proxy $tsrRegistry --implementation SchemaSCRegistryV2


# output
echo "DIDRegistry V4: $DIDRegistryProxy" >> deployments.txt
echo "TimestampProxy V3: $TimestampProxy" >> deployments.txt
echo "TrackAndTraceProxy V2: $TrackAndTraceProxy" >> deployments.txt
echo "TrustedIssuersRegistry V4: $tirRegistry" >> deployments.txt
echo "TrustedPolicyRegistry V3: $tprProxy" >> deployments.txt
echo "TrustedSchemasRegistry V3: $tsrRegistry" >> deployments.txt
