FROM node:16.14.2-alpine3.15@sha256:32f64135e74ec4dc5d63cc36318444f1d801cd23c44253124f7eccb52c4b89c5

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git g++ make py3-pip python3

# Copy root package.json + yarn.lock
COPY yarn.lock package.json ./

# Copy projects' package.json files
COPY ./apps/registries-manager/package.json ./apps/registries-manager/
COPY ./apps/users-onboarding/package.json ./apps/users-onboarding/
COPY ./apis/authorisation/package.json ./apis/authorisation/
COPY ./apis/did-registry/package.json ./apis/did-registry/
COPY ./apis/ledger/package.json ./apis/ledger/
COPY ./apis/notifications/package.json ./apis/notifications/
COPY ./apis/proxy-data-hub/package.json ./apis/proxy-data-hub/
COPY ./apis/storage/package.json ./apis/storage/
COPY ./apis/timestamp/package.json ./apis/timestamp/
COPY ./apis/trusted-apps-registry/package.json ./apis/trusted-apps-registry/
COPY ./apis/trusted-issuers-registry/package.json ./apis/trusted-issuers-registry/
COPY ./apis/trusted-ledgers-registry/package.json ./apis/trusted-ledgers-registry/
COPY ./apis/trusted-policies-registry/package.json ./apis/trusted-policies-registry/
COPY ./apis/trusted-schemas-registry/package.json ./apis/trusted-schemas-registry/
COPY ./apis/users-onboarding/package.json ./apis/users-onboarding/
COPY ./contracts/bootstrap/package.json ./contracts/bootstrap/
COPY ./contracts/did-registry/package.json ./contracts/did-registry/
COPY ./contracts/timestamp/package.json ./contracts/timestamp/
COPY ./contracts/trusted-apps-registry/package.json ./contracts/trusted-apps-registry/
COPY ./contracts/trusted-issuers-registry/package.json ./contracts/trusted-issuers-registry/
COPY ./contracts/trusted-ledgers-registry/package.json ./contracts/trusted-ledgers-registry/
COPY ./contracts/trusted-policies-registry/package.json ./contracts/trusted-policies-registry/
COPY ./contracts/trusted-schemas-registry/package.json ./contracts/trusted-schemas-registry/

# Install all the dependencies
RUN yarn install --frozen-lockfile --silent && yarn cache clean

# Copy all other files
COPY . .

# Build affected projects
RUN yarn build
