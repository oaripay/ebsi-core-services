#!/bin/bash
# Usage: ./run_trivy.sh <branch-name>

BRANCH_NAME="${1}"

## build components array from affected.yaml file
declare -a COMPONENTS=()
for entry in $(cat affected.yaml | tr ' ' ':' | cut -d ':' -f 3,5 ) ; do
  COMPONENTS+=($entry)
done

## perform trivy scan
for value in "${COMPONENTS[@]}" ;do
  component_name=$(echo $value | cut -d ':' -f 1)
  component_tag=$(echo $value | cut -d ':' -f 2)
  export component_name
  component_path="ebsi/${component_name}:${component_tag}"

  printf "\n%s\n\n" "Running trivy for ${component_name}...";
  # /usr/local/bin/run_trivy.sh - script in Jenkins VM
  /usr/local/bin/run_trivy.sh ${component_path} 1 ${container_name} ${BRANCH_NAME}
done
