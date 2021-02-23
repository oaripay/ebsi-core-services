# Load testing with k6

All the commands described below are run from the root folder.

## Install k6

Read: https://k6.io/docs/getting-started/installation

## Start the API server

```sh
yarn build
yarn start:prod
```

Or if you prefer using Docker Compose:

```sh
docker-compose up --build
```

## Run the tests

If you have installed k6, run:

```sh
k6 run tests/k6/script.js --no-usage-report
```

If you prefer to use Docker, first make sure to download the docker image:

```sh
docker pull loadimpact/k6
```

Then, run the tests:

```sh
docker run -i loadimpact/k6 run -e API_HOSTNAME=host.docker.internal --no-usage-report - <tests/k6/script.js
```
