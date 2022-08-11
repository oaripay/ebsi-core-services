#!/bin/bash

# Exit the script on any command with non 0 return code
set -e

# Go to project root
cd "$(dirname "$0")"
cd ..

mkdir -p ./contracts/bootstrap
cp -r ../../contracts/bootstrap/dist ./contracts/bootstrap/dist
cp -r ../../contracts/bootstrap/artifacts ./contracts/bootstrap/artifacts

mkdir -p ./contracts/trusted-apps-registry
cp -r ../../contracts/trusted-apps-registry/dist ./contracts/trusted-apps-registry/dist

# Required for yarn to be able to install, and also for node scripts to use tar sc.
echo '{"version":"0.0.0","main":"dist/src/types/index.js","types":"dist/src/types/index.d.ts"}' > ./contracts/trusted-apps-registry/package.json

docker build . -t trusted-apps-registry-api
