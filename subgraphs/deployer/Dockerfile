# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

FROM node:22.18.0-alpine3.22@sha256:1b2479dd35a99687d6638f5976fd235e26c5b37e8122f786fcd5fe231d63de5b

# Install build dependencies
RUN apk update && \
  apk upgrade && \
  apk add --no-cache build-base git py3-pip

WORKDIR /app

# Copy root package.json + lockfile
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/package.json ./package.json

# Copy contracts
COPY --from=builder /app/contracts/bootstrap-v2 ./contracts/bootstrap-v2
COPY --from=builder /app/contracts/did-registry-v5 ./contracts/did-registry-v5
COPY --from=builder /app/contracts/timestamp-v4 ./contracts/timestamp-v4
COPY --from=builder /app/contracts/track-and-trace ./contracts/track-and-trace
COPY --from=builder /app/contracts/trusted-issuers-registry-v5 ./contracts/trusted-issuers-registry-v5
COPY --from=builder /app/contracts/trusted-policies-registry-v2 ./contracts/trusted-policies-registry-v2
COPY --from=builder /app/contracts/trusted-schemas-registry-v2 ./contracts/trusted-schemas-registry-v2

# Copy subgraphs
COPY --from=builder /app/subgraphs/core-services ./subgraphs/core-services
COPY --from=builder /app/subgraphs/estat ./subgraphs/estat

# Install all the dependencies
RUN --mount=type=cache,target=/app/.yarn-cache YARN_CACHE_FOLDER=/app/.yarn-cache yarn install --frozen-lockfile --silent

RUN chown -R node:node /app
USER node

# Deploy
CMD [ "sh", "-c", "yarn nx run-many -t deploy -p @ebsiint-subgraph/*" ]
