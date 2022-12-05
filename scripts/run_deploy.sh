#!/bin/bash
declare -a MCO_ARGUMENTS=()
for entry in $(cat affected.yaml | tr ' ' ':' | cut -d ':' -f 3,5 ) ; do
  MCO_ARGUMENTS+=($entry)
done
for value in "${MCO_ARGUMENTS[@]}" ;do
  echo $value | tr ':' ' '
  ssh mco /usr/local/bin/run_faster_containers_only_no_puppet.sh test aio $(echo $value | tr ':' ' ')
done
