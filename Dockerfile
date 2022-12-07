FROM node:16.18.1-bullseye-slim@sha256:d0a2a23135b471f1905f0f8440032d2cdab9261488e94026fbc49002542a83bc

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
  bash \
  git \
  g++ \
  make \
  python3 \
  python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Copy root package.json + yarn.lock
COPY yarn.lock package.json ./

# Copy projects' package.json files
COPY ./apis/authorisation/package.json ./apis/authorisation/
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
COPY ./apis/trusted-ledgers-sc-registry/package.json ./apis/trusted-ledgers-sc-registry/
COPY ./apis/trusted-policies-registry/package.json ./apis/trusted-policies-registry/
COPY ./apis/trusted-schemas-registry/package.json ./apis/trusted-schemas-registry/
COPY ./apis/users-onboarding/package.json ./apis/users-onboarding/
COPY ./apps/users-onboarding-web-client-v2/package.json ./apps/users-onboarding-web-client-v2/package.json
COPY ./contracts/bootstrap/package.json ./contracts/bootstrap/
COPY ./contracts/did-registry/package.json ./contracts/did-registry/
COPY ./contracts/did-registry-v4/package.json ./contracts/did-registry-v4/
COPY ./contracts/timestamp/package.json ./contracts/timestamp/
COPY ./contracts/trusted-apps-registry/package.json ./contracts/trusted-apps-registry/
COPY ./contracts/trusted-issuers-registry/package.json ./contracts/trusted-issuers-registry/
COPY ./contracts/trusted-ledgers-sc-registry/package.json ./contracts/trusted-ledgers-sc-registry/
COPY ./contracts/trusted-policies-registry/package.json ./contracts/trusted-policies-registry/
COPY ./contracts/trusted-schemas-registry/package.json ./contracts/trusted-schemas-registry/

# Install all the dependencies
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN yarn install --frozen-lockfile --silent && yarn cache clean

# Copy all other files
COPY . .

# Build affected projects
RUN yarn build
