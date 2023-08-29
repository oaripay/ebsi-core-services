#!/bin/bash

# Parameters
SOLIDITY_VERSION="${1:-0.8.12}"  # Default to 0.8.12 if not specified
WARNING_LEVELS="${2:-Error,High}"  # Default to Error and High if not specified
TARGET_DIR="${3:-./contracts}"  # Default to ./contracts if not specified
REPORT_FILE_PATH="${4:-./slither_report.json}"  # Default to ./slither_report.json if not specified

export SOLC_VERSION=0.8.12

# Initialize result counter
declare -A RESULT_COUNTER=( ["Error"]=0 ["High"]=0 ["Medium"]=0 ["Low"]=0 ["Informational"]=0 ["Optimization"]=0 ["Other"]=0 )

# Function to process Slither result
process_slither_output() {
  local file="$1"
  local output="$2"

  echo "$output" > "${REPORT_FILE_PATH}"

  if [[ -z "$output" ]]; then
    echo "Slither did not produce output for $file"
    return
  fi

  # Parse the JSON output using jq
  local success=$(echo "$output" | jq -r '.success')
  if [[ "$success" == "true" ]]; then
    local detectors=$(echo "$output" | jq -r '.results.detectors')
    if [[ "$detectors" == "null" ]]; then
      echo "No detections for $file"
    else
      # Count and print warnings based on their level
      for level in $(echo $WARNING_LEVELS | tr "," "\n"); do
        local count=$(echo "$detectors" | jq "[.[] | select(.impact == \"$level\")] | length")
        RESULT_COUNTER["$level"]=$((RESULT_COUNTER["$level"] + count))
        echo "Count of $level issues for $file: $count"
      done
    fi
  else
    echo "Slither returned an error for $file"
    RESULT_COUNTER["Error"]=$((RESULT_COUNTER["Error"] + 1))
  fi
}

# Check if Slither is installed
if ! [ -x "$(command -v /usr/local/bin/slither)" ]; then
  echo "Slither is not installed. Exiting."
  exit 1
fi

# Install Solidity compiler if needed
/usr/local/bin/solc-select install "${SOLIDITY_VERSION}"

# Run Slither on each .sol file in the target directory
find "$TARGET_DIR" -name "*.sol" | while read -r file; do
  output=$(/usr/local/bin/slither "$file" --solc /usr/local/bin --solc-remaps '@=node_modules/@' --json -)
  process_slither_output "$file" "$output"
done

# Print summary
echo "------ Summary ------"
for level in "${!RESULT_COUNTER[@]}"; do
  echo "$level: ${RESULT_COUNTER[$level]}"
done

# Exit code logic based on the counts
if [[ ${RESULT_COUNTER["Error"]} -gt 0 || ${RESULT_COUNTER["High"]} -gt 0 || ${RESULT_COUNTER["Medium"]} -gt 0 ]]; then
  exit 1
elif [[ ${RESULT_COUNTER["Low"]} -gt 0 || ${RESULT_COUNTER["Informational"]} -gt 0 ]]; then
  exit 2
else
  exit 0
fi
