![EBSI Logo](https://ec.europa.eu/cefdigital/wiki/images/logo/default-space-logo.svg)

# Trusted Apps Registry API

This repository contains the code of the Trusted Apps Registry API.

## Table of Contents

1. [Getting started](#Getting-started)
2. [Linting](#Linting)
3. [Auditing](#Auditing)
4. [Testing](#Testing)
5. [Run with Docker Compose](#Run-with-Docker-Compose)

## Getting started

First of all, make sure to correctly configure your environment. Create a copy of `.env.example` and name it `.env`. Set the variables. Make sure the private key is correctly defined.

```sh
npm install
```

Then, start the server:

```sh
npm start
```

You should be able to open http://localhost:9000/trusted-apps-registry/v1/api-docs/.

## Linting

```sh
npm run lint
```

## Auditing

```sh
npm audit
```

## Testing

Now you can run the following command to run all the tests:

```sh
npm test
```

If you want to get the code coverage, you can run:

```sh
nm run test:cov
```

## Run with Docker Compose

You can start the server locally with Docker Compose:

```sh
docker-compose up --build
```

You should be able to open http://localhost:9000/trusted-apps-registry/v1/api-docs/.

## Licensing

Copyright (c) 2019 European Commission  
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
