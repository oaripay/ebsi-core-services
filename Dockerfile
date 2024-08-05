FROM node:20.14.0-alpine3.20@sha256:66c7d989b6dabba6b4305b88f40912679aebd9f387a5b16ffa76dfb9ae90b060

WORKDIR /app

# Install build dependencies
RUN apk update && \
  apk upgrade && \
  apk add --no-cache build-base git py3-pip

# Copy root package.json + yarn.lock
COPY yarn.lock package.json ./

# Copy projects' package.json files
COPY ./apis/authorisation/package.json ./apis/authorisation/
COPY ./apis/authorisation-v3/package.json ./apis/authorisation-v3/
COPY ./apis/authorisation-v4/package.json ./apis/authorisation-v4/
COPY ./apis/authorisation-v5/package.json ./apis/authorisation-v5/
COPY ./apis/did-registry/package.json ./apis/did-registry/
COPY ./apis/did-registry-v4/package.json ./apis/did-registry-v4/
COPY ./apis/did-registry-v5/package.json ./apis/did-registry-v5/
COPY ./apis/did-registry-v6/package.json ./apis/did-registry-v6/
COPY ./apis/ledger/package.json ./apis/ledger/
COPY ./apis/ledger-v4/package.json ./apis/ledger-v4/
COPY ./apis/shared/package.json ./apis/shared/
COPY ./apis/timestamp/package.json ./apis/timestamp/
COPY ./apis/timestamp-v4/package.json ./apis/timestamp-v4/
COPY ./apis/timestamp-v5/package.json ./apis/timestamp-v5/
COPY ./apis/track-and-trace-v1/package.json ./apis/track-and-trace-v1/
COPY ./apis/trusted-apps-registry/package.json ./apis/trusted-apps-registry/
COPY ./apis/trusted-apps-registry-v4/package.json ./apis/trusted-apps-registry-v4/
COPY ./apis/trusted-issuers-registry/package.json ./apis/trusted-issuers-registry/
COPY ./apis/trusted-issuers-registry-v4/package.json ./apis/trusted-issuers-registry-v4/
COPY ./apis/trusted-issuers-registry-v5/package.json ./apis/trusted-issuers-registry-v5/
COPY ./apis/trusted-issuers-registry-v6/package.json ./apis/trusted-issuers-registry-v6/
COPY ./apis/trusted-policies-registry/package.json ./apis/trusted-policies-registry/
COPY ./apis/trusted-policies-registry-v3/package.json ./apis/trusted-policies-registry-v3/
COPY ./apis/trusted-policies-registry-v4/package.json ./apis/trusted-policies-registry-v4/
COPY ./apis/trusted-schemas-registry/package.json ./apis/trusted-schemas-registry/
COPY ./apis/trusted-schemas-registry-v3/package.json ./apis/trusted-schemas-registry-v3/
COPY ./apis/trusted-schemas-registry-v4/package.json ./apis/trusted-schemas-registry-v4/
COPY ./contracts/bootstrap/package.json ./contracts/bootstrap/
COPY ./contracts/bootstrap-v2/package.json ./contracts/bootstrap-v2/
COPY ./contracts/did-registry/package.json ./contracts/did-registry/
COPY ./contracts/did-registry-v2/package.json ./contracts/did-registry-v2/
COPY ./contracts/did-registry-v3/package.json ./contracts/did-registry-v3/
COPY ./contracts/did-registry-v4/package.json ./contracts/did-registry-v4/
COPY ./contracts/track-and-trace/package.json ./contracts/track-and-trace/
COPY ./contracts/timestamp/package.json ./contracts/timestamp/
COPY ./contracts/timestamp-v2/package.json ./contracts/timestamp-v2/
COPY ./contracts/timestamp-v3/package.json ./contracts/timestamp-v3/
COPY ./contracts/trusted-apps-registry/package.json ./contracts/trusted-apps-registry/
COPY ./contracts/trusted-apps-registry-v3/package.json ./contracts/trusted-apps-registry-v3/
COPY ./contracts/trusted-issuers-registry/package.json ./contracts/trusted-issuers-registry/
COPY ./contracts/trusted-issuers-registry-v3/package.json ./contracts/trusted-issuers-registry-v3/
COPY ./contracts/trusted-issuers-registry-v4/package.json ./contracts/trusted-issuers-registry-v4/
COPY ./contracts/trusted-policies-registry/package.json ./contracts/trusted-policies-registry/
COPY ./contracts/trusted-policies-registry-v2/package.json ./contracts/trusted-policies-registry-v2/
COPY ./contracts/trusted-policies-registry-v3/package.json ./contracts/trusted-policies-registry-v3/
COPY ./contracts/trusted-schemas-registry/package.json ./contracts/trusted-schemas-registry/
COPY ./contracts/trusted-schemas-registry-v2/package.json ./contracts/trusted-schemas-registry-v2/
COPY ./contracts/trusted-schemas-registry-v3/package.json ./contracts/trusted-schemas-registry-v3/

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
