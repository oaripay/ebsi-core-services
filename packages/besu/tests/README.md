![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Tests Hyperledger Besu

Create an `.env` file using `.env.example` and update the corresponding values.
For e2e tests, TEST_APP_NAME and TEST_APP_PRIVATE_KEY need to be a valid app registered in the Trusted App Registry.

Launch unit tests and e2e tests with:

```
npm run test
```

To connect with a local api for e2e run:

```
EBSI_ENV=local EBSI_API=http://localhost:8080 npm run test
```

To run only unit tests:

```
npm run test:unit
```

To run only integration tests:

```
npm run test:e2e
```
