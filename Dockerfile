FROM node:22.18.0-alpine3.22@sha256:1b2479dd35a99687d6638f5976fd235e26c5b37e8122f786fcd5fe231d63de5b

WORKDIR /app

# Install build dependencies
RUN apk update && \
  apk upgrade && \
  apk add --no-cache build-base git py3-pip

# Copy root package.json + yarn.lock
COPY yarn.lock package.json ./

# Copy projects' package.json files
COPY ./apis/authorisation-v4/package.json ./apis/authorisation-v4/
COPY ./apis/did-registry-v5/package.json ./apis/did-registry-v5/
COPY ./apis/estat/package.json ./apis/estat/
COPY ./apis/ledger-v4/package.json ./apis/ledger-v4/
COPY ./apis/shared/package.json ./apis/shared/
COPY ./apis/timestamp-v4/package.json ./apis/timestamp-v4/
COPY ./apis/track-and-trace-v1/package.json ./apis/track-and-trace-v1/
COPY ./apis/trusted-issuers-registry-v5/package.json ./apis/trusted-issuers-registry-v5/
COPY ./apis/trusted-policies-registry-v3/package.json ./apis/trusted-policies-registry-v3/
COPY ./apis/trusted-schemas-registry-v3/package.json ./apis/trusted-schemas-registry-v3/
COPY ./contracts/bootstrap-v2/package.json ./contracts/bootstrap-v2/
COPY ./contracts/did-registry-v5/package.json ./contracts/did-registry-v5/
COPY ./contracts/proxy/package.json ./contracts/proxy/
COPY ./contracts/track-and-trace/package.json ./contracts/track-and-trace/
COPY ./contracts/timestamp-v4/package.json ./contracts/timestamp-v4/
COPY ./contracts/trusted-issuers-registry-v5/package.json ./contracts/trusted-issuers-registry-v5/
COPY ./contracts/trusted-policies-registry-v3/package.json ./contracts/trusted-policies-registry-v3/
COPY ./contracts/trusted-schemas-registry-v3/package.json ./contracts/trusted-schemas-registry-v3/
COPY ./subgraphs/core-services/package.json ./subgraphs/core-services/
COPY ./subgraphs/deployer/package.json ./subgraphs/deployer/
COPY ./subgraphs/estat/package.json ./subgraphs/estat/

# Install all the dependencies
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN --mount=type=cache,target=/app/.yarn-cache YARN_CACHE_FOLDER=/app/.yarn-cache yarn install --frozen-lockfile --silent

# Copy all other files
COPY . .

# Build affected projects and delete node_modules
RUN --mount=type=cache,target=/app/.nx yarn patch-package && yarn build && rm -rf ./**/node_modules

USER node
