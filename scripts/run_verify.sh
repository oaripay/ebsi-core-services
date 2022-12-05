#!/bin/bash
declare -a MCO_ARGUMENTS=()
for entry in $(cat affected.yaml | tr ' ' ':' | cut -d ':' -f 3,5 ) ; do
  MCO_ARGUMENTS+=($entry)
done
for value in "${MCO_ARGUMENTS[@]}" ;do
  echo $value | tr ':' ' '
  ssh mco /usr/local/bin/verify_container_version_fast.sh test aio $(echo $value | tr ':' ' ')
done
