#!/bin/sh
# TODO:(0) Move this script to migrations project and reuse.
function throw {
   echo "$(basename $0)"
   echo "    Aborting due to error:"
   echo "    $1"
   exit 1
}

cd $(dirname $0)/..
if [[  ! -d test ]] ; then
  throw "/test dir not found. CWD: $PWD"
fi

# Use project name AS RUN_FILE prefix
RUN_FILE="$(echo $(pwd) | sed "s/^.*\///")_ganache_var_run"
RUN_FILE=$(echo $RUN_FILE | sed "s/ /_/")

LOG_FILE="ganache_functionalTests.log"

function funCheckTruffleOrThrow { # TODO:(0)
 which truffle || throw "Truffle not found. Use 'sudo npm install -g truffle@5.1.12' to install it"
}

GANACHE_PORT=18545  # Must match truffle-config.js 'functionalTestNet' settings

function funStartGanacheFunctionalTest {
  # TODO:(?) Forze serializations of allow parallel executions. By default parallel is
  #     allowed but not sure if ganache-cli allow concurrent client
  ps -ef | egrep "${RUN_FILE}.*ganache.cl[i]"
  if [[ $? == 0 ]] ; then
      echo "$RUN_FILE found and associated process still running."
  else
      echo "Launching new ganache instance"
    rm -f $RUN_FILE
    node ./node_modules/ganache-cli/cli.js \
        --port ${GANACHE_PORT} 1>${LOG_FILE} 2>&1 &
    if [[ $? != 0 ]] ; then
      throw "Couldn't launch Ganache for testing. Check ${LOG_FILE} for more info"
    fi
    echo -n $! >> ${RUN_FILE}
  fi
}

function funAuditPackageSecurity {
  true
# npm audit # TODO:(0) Abort on critical errors.
}

function funStopGanacheFunctionalTest {
  kill $(cat ${RUN_FILE})
  rm -f ${RUN_FILE}
}

function funLaunchTestsFunctionalTest {
  if [ ! -d node_modules ] ; then
      npm install
  fi

  truffle test --network functionalTestNet
}

funCheckTruffleOrThrow
funStartGanacheFunctionalTest
funAuditPackageSecurity
# TODO: Tests node modules or install if needed.
funLaunchTestsFunctionalTest
funStopGanacheFunctionalTest
