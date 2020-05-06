# Ledger API

API to interact with Besu API and Hyperledger Fabric API. In the `packages/` folder, you will find both apis.

In development, you can run both project separately. Refer to their own documentation for more information.

## Installing

```sh
npm install
npm run bootstrap
```

## Testing

```sh
npm test
```

## Run with Docker Compose

Before starting Docker Compose, create a copy of `.env.example` and name it `.env`. Set the environment variables accordingly.

Now, run:

```sh
docker-compose up --build
```

The api will be accesible at http://localhost:8080

