# Tests Hyperledger Besu

Create an `.env` file using `.env.example` and update the corresponding values.

Launch unit tests and e2e tests with:

```
EBSI_ENV=integration npm run test
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
