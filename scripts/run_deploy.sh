#!/bin/bash

# Usage: ./run_deploy.sh
#
# Author(s):  Guillem Liarte <guillem.liarte@netdevops.com>
#
# This script will call MCO to redeploy containers on targets
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
  echo "force puppet run for hosts managed by legacy puppet server:"
  ssh mco /usr/local/bin/run_faster_containers_only_no_puppet.sh test aio $(echo $value | tr ':' ' ')
  echo
  echo "force puppet run for hosts managed by puppet v2 servers:"
  ssh mcov2 /usr/local/bin/run_faster_containers_only_no_puppet.sh test aio $(echo $value | tr ':' ' ')
done
