![EBSI Logo](https://ec.europa.eu/digital-building-blocks/wikis/images/logo/default-space-logo.svg)

# Users Onboarding Web Client v2

> GUI for the EBSI Onboarding App

This repository contains the code of a wallet web client application.
It has been developed using Create-React-App.

## Table of Contents

1. [Getting started](#Getting-started)
2. [Running](#Running)
3. [Testing](#Testing)
4. [Licensing](#Licensing)

## Getting started

### Requirements

- Node.js 16.13.2
- Yarn >= 1.22.0

### Instructions

Clone the repository and move to the project directory

```sh
git clone https://ec.europa.eu/digital-building-blocks/code/scm/ebsi/users-onboarding-web-client.git
cd users-onboarding-web-client
```

Install the required libraries and packages dependencies

```sh
yarn install
```

## Running

### Run with Docker Compose

Move to the base directory

```sh
cd users-onboarding-web-client-v2
```

Build and Run the Docker Image

```sh
docker-compose up --build
```

Or to run it on the background, just add -d option:

```sh
docker-compose up -d --build
```

And open <http://localhost:3000/users-onboarding/v2> to see the results.

If you need to stop the containers:

```sh
docker-compose down
```

Note that some of the required variables (ARGs and ENVs) are explicitly set in `docker-compose.yml`, however you have to set `REACT_APP_CAPTCHA_KEY`, `REACT_APP_EBSI_API_DOMAIN`, `REACT_APP_EBSI_APP_DOMAIN` and `REACT_APP_EULOGIN`.

You can find the list of customizable ARGs and ENVs in `Dockerfile`.

### Without Docker Compose

Run the app from the base directory:

Firstly, create a copy of `.env.example` and name it `.env` in this directory; change the variables if needed.

Now that your environment is configured, run:

```sh
yarn install

yarn start
```

This command starts the web app at '<http://localhost:3000/users-onboarding/v2>' where you can play with the Users Onboarding App v2.

## Testing

Run the tests

```sh
yarn test
```

### ESLint

```sh
yarn lint
```

### stylelint

```sh
yarn lint:css
```

or with yarn:

```sh
yarn stylelint "**/*.css"
```

### Prettier

```sh
yarn lint:prettier
```

or with yarn:

```sh
yarn prettier . --check
```

### Auditing the dependencies

```sh
yarn run audit
```

## Licensing

Copyright (c) 2019 European Commission
Licensed under the EUPL, Version 1.2 or - as soon they will be approved by the European Commission - subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:

- <https://joinup.ec.europa.eu/page/eupl-text-11-12>

Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licence for the specific language governing permissions and limitations under the Licence.
