#!/bin/bash
# Usage: ./run_verify.sh
#
# Author(s):  Guillem Liarte <guillem.liarte@netdevops.com>
#
# This script will call MCO to verify containers on targets
#
# Release v0.1
#
# Changelog :
#               v0.1 : Switched to dynamic component list (2022/12/06)
#

declare -a MCO_ARGUMENTS=()
for entry in $(cat affected.yaml | tr ' ' ':' | cut -d ':' -f 3,5 ) ; do
  MCO_ARGUMENTS+=($entry)
done
for value in "${MCO_ARGUMENTS[@]}" ;do
  echo $value | tr ':' ' '
  ssh mco /usr/local/bin/verify_container_version_fast.sh test aio $(echo $value | tr ':' ' ')
done
