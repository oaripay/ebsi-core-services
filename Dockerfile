FROM node:20.9.0-alpine3.18@sha256:8e015de364a2eb2ed7c52a558e9f716dcb615560ffd132234087c10ccc1f2c63

WORKDIR /app

# Install build dependencies
RUN apk update && \
  apk upgrade && \
  apk add --no-cache build-base git py3-pip && \
  # Fix "node-gyp fails to spawn" error
  # See: https://github.com/npm/cli/issues/6842
  npm i -g node-gyp@9.4.0

# Copy root package.json + yarn.lock
COPY yarn.lock package.json ./

# Copy projects' package.json files
COPY ./apis/authorisation/package.json ./apis/authorisation/
COPY ./apis/authorisation-v3/package.json ./apis/authorisation-v3/
COPY ./apis/authorisation-v4/package.json ./apis/authorisation-v4/
COPY ./apis/did-registry/package.json ./apis/did-registry/
COPY ./apis/did-registry-v4/package.json ./apis/did-registry-v4/
COPY ./apis/did-registry-v5/package.json ./apis/did-registry-v5/
COPY ./apis/ledger/package.json ./apis/ledger/
COPY ./apis/ledger-v4/package.json ./apis/ledger-v4/
COPY ./apis/notifications/package.json ./apis/notifications/
COPY ./apis/proxy-data-hub/package.json ./apis/proxy-data-hub/
COPY ./apis/shared/package.json ./apis/shared/
COPY ./apis/storage/package.json ./apis/storage/
COPY ./apis/timestamp/package.json ./apis/timestamp/
COPY ./apis/timestamp-v4/package.json ./apis/timestamp-v4/
COPY ./apis/trusted-apps-registry/package.json ./apis/trusted-apps-registry/
COPY ./apis/trusted-apps-registry-v4/package.json ./apis/trusted-apps-registry-v4/
COPY ./apis/trusted-issuers-registry/package.json ./apis/trusted-issuers-registry/
COPY ./apis/trusted-issuers-registry-v4/package.json ./apis/trusted-issuers-registry-v4/
COPY ./apis/trusted-issuers-registry-v5/package.json ./apis/trusted-issuers-registry-v5/
COPY ./apis/trusted-policies-registry/package.json ./apis/trusted-policies-registry/
COPY ./apis/trusted-policies-registry-v3/package.json ./apis/trusted-policies-registry-v3/
COPY ./apis/trusted-schemas-registry/package.json ./apis/trusted-schemas-registry/
COPY ./apis/trusted-schemas-registry-v3/package.json ./apis/trusted-schemas-registry-v3/
COPY ./contracts/bootstrap/package.json ./contracts/bootstrap/
COPY ./contracts/bootstrap-v2/package.json ./contracts/bootstrap-v2/
COPY ./contracts/did-registry/package.json ./contracts/did-registry/
COPY ./contracts/did-registry-v2/package.json ./contracts/did-registry-v2/
COPY ./contracts/did-registry-v3/package.json ./contracts/did-registry-v3/
COPY ./contracts/timestamp/package.json ./contracts/timestamp/
COPY ./contracts/timestamp-v2/package.json ./contracts/timestamp-v2/
COPY ./contracts/trusted-apps-registry/package.json ./contracts/trusted-apps-registry/
COPY ./contracts/trusted-apps-registry-v3/package.json ./contracts/trusted-apps-registry-v3/
COPY ./contracts/trusted-issuers-registry/package.json ./contracts/trusted-issuers-registry/
COPY ./contracts/trusted-issuers-registry-v3/package.json ./contracts/trusted-issuers-registry-v3/
COPY ./contracts/trusted-policies-registry/package.json ./contracts/trusted-policies-registry/
COPY ./contracts/trusted-policies-registry-v2/package.json ./contracts/trusted-policies-registry-v2/
COPY ./contracts/trusted-schemas-registry/package.json ./contracts/trusted-schemas-registry/
COPY ./contracts/trusted-schemas-registry-v2/package.json ./contracts/trusted-schemas-registry-v2/

# Copy patches
COPY ./.git ./.git
COPY ./patches ./patches

# Install all the dependencies
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN yarn install --frozen-lockfile --silent && yarn cache clean

# Copy all other files
COPY . .

# Build affected projects and delete node_modules
RUN yarn build && rm -rf ./**/node_modules

USER node
