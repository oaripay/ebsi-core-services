# Create reference to core-services
ARG DOCKER_TAG=latest
FROM ebsi/core-services:$DOCKER_TAG AS builder

FROM node:24.13.0-alpine3.23@sha256:931d7d57f8c1fd0e2179dbff7cc7da4c9dd100998bc2b32afc85142d8efbc213

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
COPY --from=builder /app/contracts/trusted-contracts-registry-v1 ./contracts/trusted-contracts-registry-v1
COPY --from=builder /app/contracts/trusted-issuers-registry-v5 ./contracts/trusted-issuers-registry-v5
COPY --from=builder /app/contracts/trusted-policies-registry-v3 ./contracts/trusted-policies-registry-v3
COPY --from=builder /app/contracts/trusted-schemas-registry-v3 ./contracts/trusted-schemas-registry-v3

# Copy subgraphs
COPY --from=builder /app/subgraphs/core-services ./subgraphs/core-services
COPY --from=builder /app/subgraphs/estat ./subgraphs/estat

# Install all the dependencies
RUN --mount=type=cache,target=/app/.yarn-cache YARN_CACHE_FOLDER=/app/.yarn-cache yarn install --frozen-lockfile --silent

RUN chown -R node:node /app
USER node

# Deploy
CMD [ "sh", "-c", "yarn nx run-many -t deploy -p @ebsiint-subgraph/*" ]
