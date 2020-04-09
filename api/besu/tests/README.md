# Tests EBSI API

This folder contains a set of files to test the different APIs.

## Launch the api

If you want to test it locally launch a new api.

Before launching the EBSI API configure the APIs you want to enable in the environmental variables (all enabled by default), and the port (8080 by default):

```
APIS = ON                            # all enabled
API_BESU = ON                        # besu
API_NOTARY = ON                      # notary
API_FILE_STORAGE = ON                # file storage
API_WALLET_REQUEST_STORAGE = ON      # wallet request storage
API_WALLET_HISTORICAL_STORAGE = ON   # wallet historical storage
API_KEY_VALUE_STORAGE = ON           # key value
PORT = 8080
```

Start the EBSI API. Example to start only Besu api:

```
~$ APIS=OFF API_BESU=ON node index.js
```

## Define private key

Define the private key and app name in the environmental variables. This app needs to be in the trusted list of applications:

```
TEST_APP_NAME="ebsi-wallet"
TEST_APP_PRIVATE_KEY=3afbada2b09..."
```

## Test the api

Run

```
EBSI_ENV=development npm run test
```

Depending on the environment EBSI_ENV (production, development, integration, local) the test will try to connect with the corresponding API. If you want to connect to a specific api use env TEST_API

```
TEST_API="https://api.ebsi.xyz"
```
