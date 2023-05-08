FROM node:16.20.0-alpine3.17@sha256:f1657204d3463bce763cefa5b25e48c28af6fe0cdb0f68b354f0f8225ef61be7

WORKDIR /app

# Install build dependencies
# Note: after updating the base image, make sure to update the packages versions
# See https://pkgs.alpinelinux.org/packages?name=libssl3&branch=v3.17&repo=&arch=&maintainer=
RUN apk update && \
  apk upgrade && \
  apk add --no-cache \
  build-base=0.5-r3 \
  git=2.38.5-r0 \
  py3-pip=22.3.1-r1

# Copy root package.json + yarn.lock
COPY yarn.lock package.json ./

# Copy projects' package.json files
COPY ./apis/authorisation/package.json ./apis/authorisation/
COPY ./apis/authorisation-v3/package.json ./apis/authorisation-v3/
COPY ./apis/did-registry/package.json ./apis/did-registry/
COPY ./apis/did-registry-v4/package.json ./apis/did-registry-v4/
COPY ./apis/ledger/package.json ./apis/ledger/
COPY ./apis/notifications/package.json ./apis/notifications/
COPY ./apis/proxy-data-hub/package.json ./apis/proxy-data-hub/
COPY ./apis/shared/package.json ./apis/shared/
COPY ./apis/storage/package.json ./apis/storage/
COPY ./apis/timestamp/package.json ./apis/timestamp/
COPY ./apis/trusted-apps-registry/package.json ./apis/trusted-apps-registry/
COPY ./apis/trusted-issuers-registry/package.json ./apis/trusted-issuers-registry/
COPY ./apis/trusted-issuers-registry-v4/package.json ./apis/trusted-issuers-registry-v4/
COPY ./apis/trusted-policies-registry/package.json ./apis/trusted-policies-registry/
COPY ./apis/trusted-schemas-registry/package.json ./apis/trusted-schemas-registry/
COPY ./contracts/bootstrap/package.json ./contracts/bootstrap/
COPY ./contracts/did-registry/package.json ./contracts/did-registry/
COPY ./contracts/did-registry-v4/package.json ./contracts/did-registry-v4/
COPY ./contracts/timestamp/package.json ./contracts/timestamp/
COPY ./contracts/trusted-apps-registry/package.json ./contracts/trusted-apps-registry/
COPY ./contracts/trusted-issuers-registry/package.json ./contracts/trusted-issuers-registry/
COPY ./contracts/trusted-policies-registry/package.json ./contracts/trusted-policies-registry/
COPY ./contracts/trusted-schemas-registry/package.json ./contracts/trusted-schemas-registry/

# Copy patches
COPY ./patches ./patches

# Install all the dependencies
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN yarn install --frozen-lockfile --silent && yarn cache clean

# Copy all other files
COPY . .

# Build affected projects
RUN yarn build

USER node
