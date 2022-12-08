#!/bin/bash
# Usage: ./update_yaml.bash
#
# Author(s) : Pablo M. Staiano <pablo@bwl.lu>
# 	      Guillem Liarte <guillem.liarte@netdevops.com>
#
# This script will update configuration data for a component version
#
# Release v0.2
#
# Changelog :
#               v0.2 : Switched to dynamic component list (2022/12/06)
#               v0.1 : Adapted from previous code (2020/10/09)
#

## Variables ##
export ebsi_env="test"
export conf_data="/etc/puppetlabs/code/configuration-data"
export versions_file="${ebsi_env}/versions.yaml"

## build components array from affected.yaml file
declare -a COMPONENTS=()
for entry in $(cat affected.yaml | tr ' ' ':' | cut -d ':' -f 3,5 ) ; do
  COMPONENTS+=($entry)
done

## Refresh config data
/bin/sudo -E -u ebsi1-robot /usr/bin/bash -c 'cd ${conf_data}/${ebsi_env} && git pull'

for value in "${COMPONENTS[@]}" ;do
  component_name=$(echo $value | cut -d ':' -f 1)
  component_tag=$(echo $value | cut -d ':' -f 2)
  export component_name
  printf "\n%s\n\n" "Processing ${component_name}";

  /bin/sudo -E -u ebsi1-robot /usr/bin/bash -c "/usr/bin/yq eval \".\\\"version_tag::${component_name}\\\" |= \\\"${component_tag}\\\"\" --inplace ${conf_data}/${versions_file}"
  /bin/sudo -E -u ebsi1-robot /usr/bin/bash -c 'cd ${conf_data}/${ebsi_env} && git add . && git commit -am "[auto] env:${ebsi_env} container:${component_name} tag:${component_tag}"'

done

## Push all changes to remote

cd ${conf_data}/${ebsi_env} && git push
