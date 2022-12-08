#!/bin/bash
# Usage: ./update_ecr.sh
#
# Author(s) : Pablo M. Staiano <pablo@bwl.lu>
# 	      Guillem Liarte <guillem.liarte@netdevops.com>
#
# This script will update ECR repositories with new images
#
# Release v0.2
#
# Changelog :
#               v0.2 : Switched to dynamic component list (2022/12/06)
#               v0.1 : Adapted from previous code (2020/10/9)
#

## build components array from affected.yaml file
declare -a COMPONENTS=()
for entry in $(cat affected.yaml | tr ' ' ':' | cut -d ':' -f 3,5 ) ; do
  COMPONENTS+=($entry)
done

## Log in docker to AWS ECR
/bin/aws ecr get-login-password | docker login --username AWS --password-stdin 305472350643.dkr.ecr.eu-central-1.amazonaws.com

## upload images with tag
for value in "${COMPONENTS[@]}" ;do
  component_name=$(echo $value | cut -d ':' -f 1)
  component_tag=$(echo $value | cut -d ':' -f 2)
  export component_name
  printf "\n%s\n\n" "Processing ${component_name}";
  docker tag "ebsi/${component_name}:${component_tag}" 305472350643.dkr.ecr.eu-central-1.amazonaws.com/ebsi/"${component_name}:${component_tag}";
  docker push 305472350643.dkr.ecr.eu-central-1.amazonaws.com/ebsi/"${component_name}:${component_tag}";
done
