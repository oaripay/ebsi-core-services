#!/bin/bash

# Parameters
MAX_DEPTH="${1:-10}"  # Default to 10 if not specified
TARGET_DIR="${2:-./contracts}"  # Default to ./contracts if not specified
REPORT_DIR="${3:-./mythril_reports}"  # Default to ./mythril_reports if not specified

# Initialize results directory
mkdir -p "$REPORT_DIR"

# Function to run Mythril
run_mythril_scan() {
  local file="$1"
  local max_depth="$2"
  local report_dir="$3"
  
  local command="mythril/myth:latest analyze /tmp/$file --solc-json /tmp/mythril-sol-remaps.json"
  
  if [ "$max_depth" != "0" ]; then
    command="$command --max-depth $max_depth"
  fi
  
  local result=$(docker run -v $WORKSPACE/:/tmp -w "/tmp/" --name='mythril' --label='mythril' $command)
  
  # Save to a file
  echo "$result" > "${report_dir}/$(basename $file)_report.txt"
  
  # Print to Jenkins log
  echo "Mythril Result for $file:"
  echo "$result"

  docker stop mythril
  docker rm mythril
}

# Run Mythril on each .sol file in the target directory
find "$TARGET_DIR" -name "*.sol" | while read -r file; do
  run_mythril_scan "$file" "$MAX_DEPTH" "$REPORT_DIR"
done

echo "Mythril scans completed. Reports are saved in $REPORT_DIR."
