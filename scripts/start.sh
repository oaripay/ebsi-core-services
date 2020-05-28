#!/usr/bin/env bash

# Exit the script on any command with non 0 return code
set -e

# Go to project root
cd "$(dirname "$0")"
cd ..

# Run main file
node ./dist/main.js
